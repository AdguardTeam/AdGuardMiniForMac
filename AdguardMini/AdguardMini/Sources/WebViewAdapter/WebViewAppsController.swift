// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebViewAppsController.swift
//  AdguardMini
//

import AppKit
import Foundation
import os

// MARK: - Constants
private enum Constants {
    static let userrulesEditorType: ModuleId = .userrules

    /// How long every reapable window may stay invisible before its host is
    /// Destroyed.
    static let idleTimeout: TimeInterval = 15

    /// The modules the idle reaper is allowed to destroy.
    static let reapableModules: [ModuleId] = [.tray, .settings]
}

/// Why a reap must not happen right now.
private enum IdleBlocker: CustomStringConvertible {
    /// The modal first-run flow is on screen.
    case onboarding
    /// A child window (the user-rules editor) is on screen.
    case childWindow
    /// These reapable modules are on screen or have a show in flight.
    case busyModules([ModuleId])

    var description: String {
        switch self {
        case .onboarding:
            return "onboarding is up"
        case .childWindow:
            return "a child window is open"
        case .busyModules(let modules):
            return "busy: " + modules.map(\.rawValue).joined(separator: ",")
        }
    }
}

/// Orchestrates WKWebView module lifecycle: lazy host creation, idle teardown
/// and child windows.
///
/// ## Idle teardown
///
/// A WKWebView host is expensive: a window, a layer tree and a WebContent
/// process each. Keeping tray and settings alive for the process' lifetime
/// Costs that whether or not anyone is looking at them, and Mini spends most
/// Of its life with no window on screen. So the hosts in
/// ``Constants/reapableModules`` are destroyed ``Constants/idleTimeout``
/// Seconds after the last of them stops being visible, and rebuilt on the
/// Next request exactly as a first launch would build them.
///
/// All state here is main-thread-only. Every caller already funnels through
/// `Task { @MainActor in … }`, an AppKit action or an already-`@MainActor`
/// Context; the reaper hops to the main actor before touching anything.
final class WebViewAppsController: ChildWindowControlling {
    private let hostFactory: (ModuleId) -> WKWebViewAppHost
    private var hosts: [ModuleId: WKWebViewAppHost] = [:]

    /// How long a module may stay invisible before it is reaped. Injectable
    /// So tests do not have to wait out the production timeout.
    private let idleTimeout: TimeInterval

    /// The armed countdown, or `nil` when nothing is pending. A `Task` rather
    /// Than a `Timer`: cancellation is the whole point (see
    /// ``noteIdleActivity(module:visible:)``) and a task cancels cleanly
    /// Mid-sleep.
    private var idleTask: Task<Void, Never>?

    /// Per-module count of shows currently in flight; see
    /// ``beginShowIntent(for:)``.
    private var showIntents: [ModuleId: Int] = [:]

    /// Logs idle-teardown decisions.
    private let logger = Logger(
        subsystem: Subsystem.mainApp.name,
        category: "WebViewAppsController"
    )

    /// Called after child window teardown (for close callback propagation).
    private let onChildWindowClosed: ((WindowId) -> Void)?

    /// Parent-to-child index enforcing one child window per parent.
    private var parentChildIndex: [ModuleId: WindowId] = [:]

    /// Child hosts keyed by `WindowId`.
    private var childWindows: [WindowId: WKWebViewAppHost] = [:]

    /// Creates controller with host factory and optional close callback.
    init(
        hostFactory: @escaping (ModuleId) -> WKWebViewAppHost,
        onChildWindowClosed: ((WindowId) -> Void)? = nil,
        idleTimeout: TimeInterval = Constants.idleTimeout
    ) {
        self.hostFactory = hostFactory
        self.onChildWindowClosed = onChildWindowClosed
        self.idleTimeout = idleTimeout
    }

    /// Returns existing host for module, if it was already created.
    func host(for module: ModuleId) -> WKWebViewAppHost? {
        self.hosts[module]
    }

    /// Shows module host, creating it lazily on first request.
    ///
    /// A host destroyed by the idle reaper is gone from `hosts` in the same
    /// Turn it is torn down, so the `??` below rebuilds it. The extra
    /// Terminal-state check covers the one path that can still hand back a
    /// Dead host — a `teardown()` from somewhere other than the reaper — and
    /// Makes "show a window whose teardown already started" mean "build a new
    /// One", never the silent no-op ``WKWebViewAppHost/show()`` would be.
    func show(_ module: ModuleId) {
        var host = self.hosts[module]
        if let existing = host, existing.state == .destroyed || existing.state == .tearingDown {
            self.logger.info(
                "show: discarding a torn-down host module=\(module.rawValue, privacy: .public)"
            )
            existing.onIdleActivity = nil
            host = nil
        }
        // A windowed module takes over the screen, so the tray popover must
        // Close with it: the tray's outside-click monitor does not fire for
        // The click inside the tray that opens the window, and without this
        // The popover would linger over it.
        if module != .tray {
            self.hosts[.tray]?.hide()
        }
        let live = host ?? self.makeHost(module)
        self.hosts[module] = live
        live.show()
    }

    /// Pre-creates and preloads host without showing window.
    func prepareHost(for module: ModuleId) {
        guard self.hosts[module] == nil else { return }
        self.hosts[module] = self.makeHost(module)
        self.hosts[module]?.loadEntryIfNeeded()
        // A host that exists but has never been on screen is idle by
        // Definition — start the countdown so a preload nobody uses does not
        // Keep a WebContent process alive forever.
        self.armIdleTimer()
    }

    /// Builds a host and subscribes the idle reaper to its visibility.
    private func makeHost(_ module: ModuleId) -> WKWebViewAppHost {
        let host = self.hostFactory(module)
        host.onIdleActivity = { [weak self] module, visible in
            self?.noteIdleActivity(module: module, visible: visible)
        }
        return host
    }

    /// Hides module host if present (no-op if missing).
    func hide(_ module: ModuleId) {
        self.hosts[module]?.hide()
    }

    /// Destroys module host if present (no-op if missing), tearing down the
    /// Window, WKWebView and WebContent process and dropping the host from
    /// The module map.
    func destroy(_ module: ModuleId) {
        self.destroyHost(module)
    }

    /// Returns an open child window's host, if any.
    ///
    /// The child-map counterpart of ``host(for:)``. Child windows are not
    /// Reachable through ``host(for:)`` because they are keyed by
    /// ``WindowId`` rather than by module.
    func childHost(for windowId: WindowId) -> WKWebViewAppHost? {
        self.childWindows[windowId]
    }

    // MARK: - Idle teardown

    /// Suppresses idle teardown for `module` until the matching
    /// ``endShowIntent(for:)``. Pair them with `defer`.
    ///
    /// This is the answer to the show/reap race. A caller that shows a window
    /// Is not atomic: ``WebViewTrayWindowController/showTrayWindow()`` creates
    /// The host, `await`s a Big Sur positioning delay, reads the status-item
    /// Rect, and only then calls `show()`. The host exists and is invisible
    /// For that whole stretch, which is exactly what the reaper destroys — and
    /// The caller is holding the doomed host in a local, so its `show()` would
    /// Land on a `.destroyed` host and do nothing. A click that opens no
    /// Window.
    ///
    /// Counted rather than a flag so overlapping shows of the same module
    /// Nest correctly.
    func beginShowIntent(for module: ModuleId) {
        self.showIntents[module, default: 0] += 1
        // An intent means a window is on its way in, so any pending teardown
        // Is already stale.
        self.cancelIdleTimer()
    }

    /// Balances ``beginShowIntent(for:)``.
    func endShowIntent(for module: ModuleId) {
        guard let count = self.showIntents[module], count > 0 else { return }
        if count == 1 {
            self.showIntents.removeValue(forKey: module)
            // The show may have ended without anything becoming visible (an
            // Aborted tray click, a missing screen rect). Re-arm so such a
            // Path cannot leave a host alive with no countdown behind it.
            self.armIdleTimer()
        } else {
            self.showIntents[module] = count - 1
        }
    }

    /// Host visibility hook: cancels the countdown on show, arms it on hide.
    private func noteIdleActivity(module: ModuleId, visible: Bool) {
        if visible {
            self.cancelIdleTimer()
        } else {
            self.armIdleTimer()
        }
    }

    /// (Re)starts the countdown to the next idle check.
    ///
    /// Arming while anything blocks a reap would only produce a check that
    /// Rearms itself every ``idleTimeout`` seconds for as long as the block
    /// Lasts. Every blocker arms the countdown when it clears — hiding any
    /// Host fires ``WKWebViewAppHost/onIdleActivity`` (child windows
    /// Included, see ``makeHost(_:)``), ``endShowIntent(for:)`` arms on
    /// Release, and ``closeChildWindow(_:)`` arms after the editor is gone.
    private func armIdleTimer() {
        guard self.idleBlocker() == nil else {
            self.cancelIdleTimer()
            return
        }
        self.idleTask?.cancel()
        let timeout = self.idleTimeout
        self.idleTask = Task { @MainActor [weak self] in
            try? await Task.sleep(seconds: timeout)
            guard !Task.isCancelled else { return }
            self?.reapIdleHosts()
        }
    }

    /// Cancels a pending teardown — something is visible again.
    private func cancelIdleTimer() {
        self.idleTask?.cancel()
        self.idleTask = nil
    }

    /// Destroys the reapable hosts, unless something says the user is still
    /// Mid-flow.
    @MainActor
    private func reapIdleHosts() {
        self.idleTask = nil

        if let blocker = self.idleBlocker() {
            // Deliberately not rearming: ``armIdleTimer()`` consults the same
            // Predicate and would refuse for the same reason. Whatever is
            // Blocking arms the countdown when it stops blocking.
            self.logger.debug("idle check skipped — \(blocker.description, privacy: .public)")
            return
        }

        self.logger.info("idle for \(self.idleTimeout, privacy: .public)s — destroying idle module windows")
        Constants.reapableModules.forEach(self.destroyHost)
    }

    /// What currently forbids a reap, or `nil` when nothing does.
    ///
    /// The single source of truth for "is the app idle", shared by
    /// ``armIdleTimer()`` and ``reapIdleHosts()``. The two must agree, and
    /// Keeping the conditions in one place is what stops them drifting apart.
    private func idleBlocker() -> IdleBlocker? {
        // Onboarding is a modal first-run flow with no affordance to bring it
        // Back, and the user-rules editor may hold unsaved changes.
        if let onboarding = self.hosts[.onboarding], self.isOnScreen(onboarding) {
            return .onboarding
        }
        if self.childWindows.values.contains(where: self.isOnScreen) {
            return .childWindow
        }
        let busy = Constants.reapableModules.filter(self.isBusy)
        return busy.isEmpty ? nil : .busyModules(busy)
    }

    /// Whether `module` must survive this round: on screen, or with a show in
    /// Flight that has not put it on screen yet.
    private func isBusy(_ module: ModuleId) -> Bool {
        if self.showIntents[module, default: 0] > 0 {
            return true
        }
        guard let host = self.hosts[module] else { return false }
        return self.isOnScreen(host)
    }

    /// Whether the user can still get back to this window without reopening
    /// It from scratch.
    ///
    /// `isVisible` alone is not enough: it is `false` for a window minimized
    /// To the Dock. Settings is `.miniaturizable`, so a minimized settings
    /// Window would read as reapable — and destroying it would make its Dock
    /// Entry vanish along with whatever the page was holding.
    private func isOnScreen(_ host: WKWebViewAppHost) -> Bool {
        host.window.isVisible || host.window.isMiniaturized
    }

    /// Tears a host down and drops it from `hosts` in the same turn.
    ///
    /// The atomicity is the point: no caller can ever observe a `.destroyed`
    /// Host through ``host(for:)``, because the map entry and the live host
    /// Stop existing together. Every "poke a dead window" race therefore
    /// Collapses into the ordinary lazy-creation path — the next ``show(_:)``
    /// Builds a fresh host, as a first launch would.
    private func destroyHost(_ module: ModuleId) {
        guard let host = self.hosts.removeValue(forKey: module) else { return }
        host.onIdleActivity = nil
        host.teardown()
    }

    // MARK: - ChildWindowControlling

    func openChildWindow(
        parent: ModuleId,
        html: URL?,
        params: ChildWindowParams
    ) throws -> WindowId {
        // Reuse existing child for the same parent.
        if let existingId = self.parentChildIndex[parent] {
            self.childWindows[existingId]?.show()
            return existingId
        }

        // Parent must exist and not be in terminal state.
        guard let parentHost = self.hosts[parent],
              parentHost.state != .destroyed,
              parentHost.state != .tearingDown else {
            throw ChildWindowError.parentClosed(parent: parent)
        }

        // Child entry URL is resolved by host factory; `html` stays for API shape.
        let childHost = self.makeHost(Constants.userrulesEditorType)

        // Apply caller-provided title and initial content size.
        childHost.window.title = params.caption

        let defaultFrame = NSWindow.frameRect(
            forContentRect: childHost.windowConfiguration.contentFrame,
            styleMask: childHost.windowConfiguration.styleMask
        )
        if childHost.window.frame == defaultFrame {
            let parentFrame = parentHost.window.frame
            let childSize = childHost.window.frame.size
            childHost.window.setFrameOrigin(
                CGPoint(
                    x: parentFrame.midX - childSize.width / 2,
                    y: parentFrame.midY - childSize.height / 2
                )
            )
        }
        // Honor a caller-requested content size (the `ChildWindowParams`
        // Width/height) so the advertised size control is not a silent no-op.
        if params.width > 0, params.height > 0 {
            childHost.window.setContentSize(
                NSSize(width: params.width, height: params.height)
            )
        }

        self.childWindows[params.id] = childHost
        self.parentChildIndex[parent] = params.id

        childHost.show()
        return params.id
    }

    func closeChildWindow(_ windowId: WindowId) throws {
        guard let childHost = self.childWindows[windowId] else {
            throw ChildWindowError.alreadyClosed(windowId: windowId)
        }
        childHost.teardown()
        self.childWindows.removeValue(forKey: windowId)
        // Remove parent mapping that points to this window id.
        if let parentKey = self.parentChildIndex.first(where: { $0.value == windowId })?.key {
            self.parentChildIndex.removeValue(forKey: parentKey)
        }

        self.onChildWindowClosed?(windowId)

        // The editor is gone; if settings is hidden behind it the group is
        // Now idle. `teardown()` clears the host's hook, so nothing else
        // Arms the countdown on this path.
        self.armIdleTimer()
    }
}
