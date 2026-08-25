// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewAppHost.swift
//  AdguardMini
//

import Foundation
import WebKit
import AppKit
import os
import AML
import ProtoSchema  // WKWebViewBridge (the RPC dispatcher lives in ProtoSchema)

// MARK: - Host lifecycle state

/** Lifecycle state. */
enum HostState {
    case unloaded, loading, error, ready, shown, hidden, tearingDown, destroyed
}

// MARK: - Visibility callback type alias

/// Visibility hook.
typealias VisibilityChange = (Bool) -> Void

// MARK: - WKWebViewAppHost

/** Module host. */
final class WKWebViewAppHost: NSObject {
    // MARK: - Constants

    private enum Constants {
        static let webUIResourceSubdirectory = "WebUI"
        static let htmlFileExtension = "html"

        static let rpcMessageName = "rpc"
        static let openLinkMessageName = "openLinkInBrowser"
        static let clipboardMessageName = "systemClipboard"

        // WKWebView runtime-error + recurring-timeout routing — names of
        // The message handlers registered on `userContentController`.
        static let jsRuntimeErrorMessageName = "jsRuntimeError"
        static let rpcTimeoutAlertMessageName = "rpcTimeoutAlert"
        static let jsLogMessageName = "jsLog"

        /// Outside-click events within this many seconds of `show()` are
        /// Ignored so the status-bar click that opens the tray (whose
        /// Mouse-down may arrive just after `show()`) does not close it.
        static let outsideClickGraceSeconds: TimeInterval = 0.35
    }

    // MARK: - Stored properties (initialized before super.init)

    let module: ModuleId
    let window: NSWindow
    let webView: WKWebView
    let vibrancyView: NSVisualEffectView?
    let bridge: WKWebViewBridge
    let entryURL: URL
    let windowConfiguration: ModuleWindowConfiguration

    /// Captured from `WKWebView.loadFileURL` for test verification (US8.3).
    private(set) var lastLoadFileURLAllowingReadAccessTo: URL = URL(fileURLWithPath: "/")

    // MARK: - Initialized after super.init (via nil-then-assign)

    private var systemActionsHandler: SystemActionsMessageHandler?

    // MARK: - Visibility + lifecycle

    private let onVisibilityChange: VisibilityChange?

    /// Visibility hook owned by ``WebViewAppsController``'s idle reaper,
    /// Separate from ``onVisibilityChange``.
    ///
    /// The module's own ``onVisibilityChange`` belongs to `AppDelegate`'s host
    /// Factory and cannot be intercepted. The reaper needs a hook of its own
    /// Because most hides never go through the controller at all: the red
    /// Close button and Cmd+W land in ``windowShouldClose(_:)``, the tray's
    /// Outside-click monitor and the status-bar toggle call ``hide()``
    /// Directly. Without this, the countdown would only ever start for the
    /// Handful of hides routed through ``WebViewAppsController/hide(_:)``.
    var onIdleActivity: ((ModuleId, Bool) -> Void)?

    /// Outside-click close handles for the tray panel. The previous
    /// `didResignKey` auto-hide fired spuriously right after
    /// `makeKeyAndOrderFront` on a non-activating `NSPanel` in an accessory
    /// app (closing the tray the instant it opened). A global mouse monitor
    /// is the reliable replacement: it closes the tray only on a real click
    /// outside the window.
    private var outsideClickGlobalMonitor: Any?
    private var outsideClickLocalMonitor: Any?

    /// Set by `show()` when the page is still `.loading`; flushed by
    /// `didFinishNavigation()` so `onVisibilityChange(true)` is NOT lost
    /// on first show.
    private var pendingVisibilityChange = false

    /// Observer for the settings window's `didBecomeMain` notification, so
    /// `onVisibilityChange(true)` fires not only on `show()` but also when
    /// The user returns to the already-open window. The settings UI then
    /// Re-fetches current state (e.g. the login item health check card).
    private var windowMainObserver: NSObjectProtocol?

    /// Time of the most recent `show()`. The outside-click monitor ignores
    /// Events within a short grace period after showing so the click that
    /// Opened the tray (whose mouse-down may arrive just after `show()`)
    /// does not instantly close it.
    private var lastShownTime: Date = .distantPast

    /// Logs `WKWebView` load failures.
    private let logger = Logger(
        subsystem: Subsystem.mainApp.name,
        category: "WKWebViewAppHost"
    )

    private(set) var state: HostState = .unloaded

    /// Failure presenter — routes load failures, JS-runtime errors,
    /// and recurring-RPC-timeout notifications to telemetry + native
    /// alert + (optional) app restart. `.noOp` default keeps existing
    /// tests and Sciter paths untouched.
    private let failurePresenter: any WKWebViewFailurePresenting

    /// Pure decision function for document navigations. Allows only the
    /// entry page; cancels and routes everything else.
    private let navigationPolicy: NavigationPolicy

    /// Holds the two message-handler instances so they outlive the
    /// `WKUserContentController` they're registered on (otherwise
    /// `WKScriptMessageHandler` weak-references them and they get
    /// released).
    private var rpcTimeoutAlertHandler: RpcTimeoutAlertMessageHandler?
    private var jsRuntimeErrorHandler: JsRuntimeErrorMessageHandler?
    /// Retains the JS→Swift log forwarder (DIAG instrumentation).
    private var jsLogHandler: JsLogMessageHandler?

    /// Retains the `WKUIDelegate` that explicitly refuses window
    /// creation, script dialogs, and file pickers. `WKWebView.uiDelegate`
    /// is weak, so the host must retain it.
    private var interfaceRequestDenier: InterfaceRequestDenier?

    // MARK: - Init

    init(
        module: ModuleId,
        entryURL: URL? = nil,
        onVisibilityChange: VisibilityChange? = nil,
        failurePresenter: any WKWebViewFailurePresenting = WKWebViewFailurePresenter.noOp,
        bridgeSetup: (WKWebViewBridge) -> Void,
        externalLinkGate: ExternalLinkGate? = nil,
        extraMessageHandlersSetup: ((WKUserContentController) -> Void)? = nil
    ) {
        let config = ModuleWindowConfigurator.config(for: module)
        let webView = WKWebViewAppHost.makeWebView()
        let bridge = WKWebViewBridge(webView: webView)
        // Create the panel WITH the full config styleMask so
        // `.nonactivatingPanel` is set at init time. Setting the mask only
        // Later (via `apply`) leaves stale panel defaults (`hidesOnDeactivate`,
        // Floating behavior) from the initial activating-panel state.
        let window = WKWebViewAppHost.makeWindow(
            kind: config.windowKind,
            frame: config.contentFrame,
            styleMask: config.styleMask
        )
        let vibrancyResult = WKWebViewAppHost.apply(window: window, config: config, webView: webView)
        let entry = WKWebViewAppHost.resolveEntryURL(
            module: module,
            entryURL: entryURL
        )

        // `ExternalLinkGate` shared by the link-click handler and reused by
        // The navigation policy for cancelled-navigation handoffs.
        let linkGate = externalLinkGate ?? ExternalLinkGate(
            linkOpener: NSWorkspaceLinkOpener()
        )

        // Initialize all stored properties before super.init.
        self.module = module
        self.windowConfiguration = config
        self.webView = webView
        self.bridge = bridge
        self.onVisibilityChange = onVisibilityChange
        self.vibrancyView = vibrancyResult
        self.window = window
        self.entryURL = entry
        self.failurePresenter = failurePresenter
        self.navigationPolicy = NavigationPolicy(
            entryURL: entry,
            externalLinkGate: linkGate
        )

        super.init()

        // Page-readiness gate for Swift→TS pushes (`bridge.dispatchCallback`).
        // The JS shim `window.__dispatchCallback` is not installed until the
        // Module bundle executes, so pushes racing page load throw a
        // WKErrorDomain Code 4 JS exception. `beginLoad()` buffers them; the
        // `didFinishNavigation()` below reopens the gate and flushes.
        bridge.beginLoad()

        configurePostInit(webView: webView, bridge: bridge, linkGate: linkGate)

        bridgeSetup(bridge)

        // Least privilege: only the `InternalService` methods this module's
        // UI invokes are reachable (ModuleCapabilities.internalServiceMethods).
        bridge.restrict(
            service: "InternalService",
            to: ModuleCapabilities.internalServiceMethods(for: module)
        )

        // Removed the `didResignKey` auto-hide: it fired spuriously right
        // After `makeKeyAndOrderFront` on a non-activating `NSPanel`,
        // Closing the tray the instant it opened. Outside-click closing is
        // Now handled by mouse-down monitors installed in `show()`.

        // Allow module-specific message handlers to be registered on this
        // Host's `userContentController`. Invoked AFTER the system handlers
        // (`rpc`, `openLinkInBrowser`, and `systemClipboard`),
        // So module-specific handlers do not collide.
        // Currently unused by every module: the child-window feature moved
        // To the `InternalService` RPC (`OpenUserRulesWindow` /
        // `CloseUserRulesWindow`) in the merged user-rules-editor change,
        // So `AppDelegate` passes `nil` for all modules. Retained because
        // `ModuleCapabilities` documents the shared handler set and this
        // Seam is the documented extension point if a module ever needs a
        // Module-specific handler again.
        if let extra = extraMessageHandlersSetup {
            extra(webView.configuration.userContentController)
        }
    }

    /// Registers the shared message handlers and delegates documented in
    /// `ModuleCapabilities`. See that type for the per-module capability set.
    ///
    /// Registers message handlers and sets delegates after `super.init()`.
    /// Extracted from the init body to stay under the function-body-length
    /// limit. Called once, immediately after `super.init()`.
    private func configurePostInit(webView: WKWebView, bridge: WKWebViewBridge, linkGate: ExternalLinkGate) {
        webView.navigationDelegate = self

        // Explicitly refuse window creation, script dialogs,
        // And file pickers rather than leaving them to the implicit default.
        let denier = InterfaceRequestDenier()
        webView.uiDelegate = denier
        self.interfaceRequestDenier = denier

        // Own the window delegate so the host can intercept the red close
        // Button / Cmd+W via `windowShouldClose(_:)`. Without this, AppKit
        // `close()`s the window, which detaches the WKWebView and tears
        // Down its WebContent render-tree; reopening then reuses a stale
        // `.shown` host whose WKWebView is dead — the
        // EXC_BAD_ACCESS / kill-on-reopen bug. `NSWindow.delegate` is weak,
        // So this adds no retain cycle.
        self.window.delegate = self

        let systemHandler = SystemActionsMessageHandler(
            externalLinkGate: linkGate,
            pasteboard: NSPasteboardWriter()
        )
        webView.configuration.userContentController.add(
            bridge,
            name: Constants.rpcMessageName
        )
        webView.configuration.userContentController.add(
            systemHandler,
            name: Constants.openLinkMessageName
        )
        webView.configuration.userContentController.add(
            systemHandler,
            name: Constants.clipboardMessageName
        )
        self.systemActionsHandler = systemHandler

        // Failure surfacing handlers — registered unconditionally so
        // The TS shim's posts surface native alerts in both Debug and
        // Release builds.
        let rpcTimeoutAlert = RpcTimeoutAlertMessageHandler(presenter: self.failurePresenter)
        let jsRuntimeError = JsRuntimeErrorMessageHandler(presenter: self.failurePresenter)
        webView.configuration.userContentController.add(
            rpcTimeoutAlert,
            name: Constants.rpcTimeoutAlertMessageName
        )
        webView.configuration.userContentController.add(
            jsRuntimeError,
            name: Constants.jsRuntimeErrorMessageName
        )
        self.rpcTimeoutAlertHandler = rpcTimeoutAlert
        self.jsRuntimeErrorHandler = jsRuntimeError

        // DIAG-only: mirror `window.log` (TS) into the host log stream so
        // JS and Swift diagnostic logs appear together in one console.
        let jsLog = JsLogMessageHandler(module: self.module)
        webView.configuration.userContentController.add(
            jsLog,
            name: Constants.jsLogMessageName
        )
        self.jsLogHandler = jsLog
    }

    /// Confirms the host is actually released after ``teardown()``.
    ///
    /// The idle teardown only reclaims anything if the host really
    /// Deallocates: the `NSWindow`, the `WKWebView` and its WebContent
    /// Process all hang off this object. A missing `host.deinit` in the log
    /// After a reap means something still retains it and the memory is not
    /// Coming back.
    deinit {
        let moduleName = self.module.rawValue
        self.logger.info("host.deinit module=\(moduleName, privacy: .public)")
    }

    // MARK: - Public methods

    /**
     * Load the module entry HTML, restricting read access to the `WebUI/`
     * resource directory (per US8.3). Idempotent. Allows retry from the
     * `.error` state.
     */
    func loadEntryIfNeeded() {
        guard self.state == .unloaded || self.state == .error else { return }
        self.state = .loading

        let allowedDir = self.entryURL.deletingLastPathComponent()
        self.lastLoadFileURLAllowingReadAccessTo = allowedDir
        self.webView.loadFileURL(
            self.entryURL,
            allowingReadAccessTo: allowedDir
        )
    }

    /**
     * Show the window. Idempotent. Defers `onVisibilityChange(true)` to
     * `didFinishNavigation()` when the page is still `.loading`.
     */
    func show() {
        guard self.state != .tearingDown, self.state != .destroyed else { return }
        self.loadEntryIfNeeded()
        let moduleName = self.module.rawValue
        let stateDesc = String(describing: self.state)
        self.logger.info("host.show module=\(moduleName, privacy: .public) state=\(stateDesc, privacy: .public)")
        self.lastShownTime = Date()
        // The app runs with `.accessory` activation policy. Without
        // Activating the app, the window server leaves windows marked
        // Occluded, so the WebContent process suspends layer compositing —
        // The page loads and its JS executes (RPCs flow) but nothing paints
        // And mouse events may not reach the web view
        // (`markAllLayersVolatile` warnings). Activating the app makes the
        // Window server treat all module windows as actively rendered and
        // Interactive.
        if self.windowConfiguration.windowKind == .window {
            // Windowed modules register with `UIUtils`, which switches the
            // App to `.regular` (Dock icon) and activates it.
            UIUtils.windowWillBeVisible(self.window)
        } else {
            self.activateApp()
        }
        if self.module == .tray {
            self.window.hidesOnDeactivate = false
        }
        self.window.makeKeyAndOrderFront(nil)
        // `activate()` on macOS 14+ completes asynchronously, so the ordering
        // Above can land before activation takes effect. For `.accessory`-policy
        // Apps the window server then leaves a `.normal`-level window (settings)
        // Behind the previously-active app's windows. Force the window to the
        // Front of its level regardless of activation state so module windows
        // Always appear on top of other apps.
        self.window.orderFrontRegardless()
        switch self.state {
        case .ready, .hidden:
            self.state = .shown
            self.onVisibilityChange?(true)
        case .loading:
            self.pendingVisibilityChange = true
        default:
            break
        }
        self.installOutsideClickMonitor()
        self.installWindowMainObserver()
        // Cancels any pending idle teardown for the whole module group.
        self.onIdleActivity?(self.module, true)
    }

    /**
     * Hide the window. Idempotent. Guards against the torn-down states so a
     * dead host cannot be resurrected from `.hidden`.
     */
    func hide() {
        guard self.state != .tearingDown, self.state != .destroyed else { return }
        let moduleName = self.module.rawValue
        let stateDesc = String(describing: self.state)
        self.logger.info("host.hide module=\(moduleName, privacy: .public) state=\(stateDesc, privacy: .public)")
        self.removeOutsideClickMonitor()
        self.window.orderOut(nil)
        self.state = .hidden
        // The window is no longer visible; `UIUtils` restores the
        // Menu-bar-only policy when this was the last registered window.
        if self.windowConfiguration.windowKind == .window {
            UIUtils.removeWindow(self.window)
        }
        // Clear any deferred visibility change: if the page was still loading,
        // `didFinishNavigation` must not later deliver `.visible` for a window
        // The user already hid.
        self.pendingVisibilityChange = false
        self.onVisibilityChange?(false)
        // Arms the idle countdown; the reaper re-checks every module before
        // Destroying anything, so a hide with another window still up is safe.
        self.onIdleActivity?(self.module, false)
    }

    /**
     * Tear down the window and bridge. Idempotent.
     */
    func teardown() {
        self.state = .tearingDown

        self.removeOutsideClickMonitor()
        if let windowMainObserver = self.windowMainObserver {
            NotificationCenter.default.removeObserver(windowMainObserver)
            self.windowMainObserver = nil
        }

        self.webView.configuration.userContentController.removeScriptMessageHandler(
            forName: Constants.rpcMessageName
        )
        self.webView.configuration.userContentController.removeScriptMessageHandler(
            forName: Constants.openLinkMessageName
        )
        self.webView.configuration.userContentController.removeScriptMessageHandler(
            forName: Constants.clipboardMessageName
        )

        // Teardown mirrors the registration block above.
        self.webView.configuration.userContentController.removeScriptMessageHandler(
            forName: Constants.rpcTimeoutAlertMessageName
        )
        self.webView.configuration.userContentController.removeScriptMessageHandler(
            forName: Constants.jsRuntimeErrorMessageName
        )
        self.webView.configuration.userContentController.removeScriptMessageHandler(
            forName: Constants.jsLogMessageName
        )

        // Nulling the reaper hook first: nothing below may re-arm the
        // Countdown from inside a teardown.
        self.onIdleActivity = nil

        self.window.orderOut(nil)
        if self.windowConfiguration.windowKind == .window {
            UIUtils.removeWindow(self.window)
        }
        self.webView.stopLoading()

        // Detach the delegates before the window closes so no AppKit or
        // WebKit callback lands in a half-destroyed host. Both properties are
        // Weak, so this is about ordering, not about breaking a cycle.
        self.window.delegate = nil
        self.webView.navigationDelegate = nil
        self.webView.uiDelegate = nil
        self.interfaceRequestDenier = nil

        // Take the web view out of the view hierarchy and close the window.
        // `orderOut` alone frees nothing: AppKit still owns an ordered-out
        // Window, so its layer tree, the WKWebView and the WebContent process
        // Behind it all stay alive. `close()` releases that ownership and the
        // Window-server resources with it, leaving the host's own `window`
        // Reference as the last one — which dies with the host. `close()`
        // Does not consult `windowShouldClose(_:)` (only `performClose(_:)`
        // Does), so this cannot recurse back into the delegate.
        self.window.contentView = nil
        self.webView.removeFromSuperview()
        self.window.close()

        self.state = .destroyed
    }

    // MARK: - Window main observer (settings)

    /// Installs a `didBecomeMain` observer for the settings window so that
    /// `onVisibilityChange(true)` also fires when the user returns to the
    /// Already-open window (e.g. after toggling the login item in System
    /// Settings). The settings `onVisibilityChange` closure runs the
    /// `OnWindowDidBecomeMain` recovery, which re-fetches settings so the
    /// Health check card reflects the current helper status. Idempotent.
    private func installWindowMainObserver() {
        guard self.module == .settings, self.windowMainObserver == nil else { return }
        self.windowMainObserver = NotificationCenter.default.addObserver(
            forName: NSWindow.didBecomeMainNotification,
            object: self.window,
            queue: .main
        ) { [weak self] _ in
            self?.handleWindowBecameMain()
        }
    }

    /// Re-runs the "shown" visibility callback when the settings window
    /// Becomes main again while it is already shown.
    private func handleWindowBecameMain() {
        guard self.state == .shown else { return }
        self.onVisibilityChange?(true)
    }

    // MARK: - Outside-click close (tray panel)
    private func installOutsideClickMonitor() {
        guard self.module == .tray else { return }
        self.removeOutsideClickMonitor()

        // Local monitor: mouse-downs that occur inside this app's windows
        // But outside the tray panel (e.g. clicking another window).
        self.outsideClickLocalMonitor = NSEvent.addLocalMonitorForEvents(
            matching: [.leftMouseDown, .rightMouseDown, .otherMouseDown]
        ) { [weak self] event in
            self?.handleOutsideClick(event: event) ?? event
        }

        // Global monitor: mouse-downs anywhere on the system (other apps).
        self.outsideClickGlobalMonitor = NSEvent.addGlobalMonitorForEvents(
            matching: [.leftMouseDown, .rightMouseDown, .otherMouseDown]
        ) { [weak self] _ in
            guard let self else { return }
            if self.shouldIgnoreOutsideClick() { return }
            self.logger.error("host.outsideClick global — hiding tray")
            self.hide()
        }
    }

    /// Removes the outside-click monitors.
    private func removeOutsideClickMonitor() {
        if let local = self.outsideClickLocalMonitor {
            NSEvent.removeMonitor(local)
            self.outsideClickLocalMonitor = nil
        }
        if let global = self.outsideClickGlobalMonitor {
            NSEvent.removeMonitor(global)
            self.outsideClickGlobalMonitor = nil
        }
    }

    /// Returns the event unchanged when the click is inside the tray window
    /// Or on the status-bar button (whose toggle closes the tray on mouse-up).
    /// For any other click in this app's windows — e.g. the settings window
    /// Opened from the tray — hides the tray and passes the event through so
    /// The click still reaches its target.
    private func handleOutsideClick(event: NSEvent) -> NSEvent? {
        guard self.module == .tray, self.state == .shown else { return event }
        // Ignore the click that just opened the tray: its mouse-down may
        // Arrive right after `show()`, and closing on it would make the
        // Panel unusable.
        if self.shouldIgnoreOutsideClick() {
            return event
        }
        let location = NSEvent.mouseLocation
        if self.window.frame.contains(location) {
            return event
        }
        if self.isInStatusBarStrip(location) {
            return event
        }
        self.logger.error("host.outsideClick local — hiding tray")
        self.hide()
        return event
    }

    /// True when the click landed in the status-bar strip (where the tray
    /// Icon lives). Such clicks are left to the `handleStatusBarClicked`
    /// Toggle, which closes the tray on mouse-up; pre-hiding here on
    /// Mouse-down would make the toggle believe the tray is already hidden
    /// And reopen it.
    private func isInStatusBarStrip(_ location: CGPoint) -> Bool {
        guard let screen = NSScreen.screens.first(where: { $0.frame.contains(location) }) else {
            return false
        }
        let statusBarThickness = NSStatusBar.system.thickness
        return location.y >= screen.frame.maxY - statusBarThickness
    }

    /// True when an outside-click event should be ignored because the tray
    /// Was shown very recently. Prevents the opening click from closing it.
    private func shouldIgnoreOutsideClick() -> Bool {
        Date().timeIntervalSince(self.lastShownTime) < Constants.outsideClickGraceSeconds
    }

    /// Activates the app so module windows are treated as actively
    /// Rendered by the window server (see `show()`). Without this, the
    /// `.accessory` activation policy causes the window server to mark
    /// Windows as occluded, suspending layer compositing and mouse-event
    /// Delivery. Uses the non-deprecated `activate()` on macOS 14+ and
    /// The legacy flag below.
    private func activateApp() {
        if #available(macOS 14.0, *) {
            NSApplication.shared.activate()
        } else {
            NSApp.activate(ignoringOtherApps: true)
        }
    }

    // MARK: - WKNavigationDelegate test seams

    /// Test seam invoked by `WKNavigationDelegate.webView(_:didFinish:)` on
    /// navigation completion. Flushes a pending visibility change set by
    /// `show()` so the recovery sequence is not lost on first show.
    func didFinishNavigation() {
        // The page bundle has executed by now, so `window.__dispatchCallback`
        // Is installed. Reopen the push gate and flush any Swift→TS pushes
        // Buffered by `beginLoad()`. Called unconditionally — including the
        // `.hidden` case (host hidden mid-load) — so pushes after that are
        // Not buffered forever.
        self.bridge.markPageReady()
        guard self.state == .loading else { return }
        self.state = .ready
        if self.pendingVisibilityChange {
            self.pendingVisibilityChange = false
            self.state = .shown
            self.onVisibilityChange?(true)
        }
    }

    /// Test seam invoked by
    /// `WKNavigationDelegate.webView(_:didFailProvisionalNavigation:withError:)`.
    /// Logs the failure and transitions `loading → error`. `loadEntryIfNeeded()`
    /// allows retry from this state.
    func didFailProvisionalNavigation(error: Error) {
        // `.hidden` is reachable when the user hides a host mid-load; the
        // Pending navigation keeps running and can still fail. Handling it
        // Here guarantees the next `show()` reloads instead of presenting a
        // Dead page (and the failure is still surfaced).
        guard self.state == .loading || self.state == .hidden else { return }
        self.logger.error(
            "WKWebView provisional navigation failed: \(error.localizedDescription, privacy: .public)"
        )
        self.pendingVisibilityChange = false
        self.state = .error
        // Route to the failure presenter for telemetry + native alert
        // + (optional) app restart.
        let moduleName = self.module.rawValue
        Task { @MainActor in
            await self.failurePresenter.handleLoadFailure(module: moduleName, error: error)
        }
    }

    /// Test seam retained for backward compatibility with existing tests.
    /// The previous `didResignKey` auto-hide is intentionally disabled: it
    /// fired spuriously right after `makeKeyAndOrderFront` on a non-activating
    /// `NSPanel` in an accessory app, closing the tray the instant it opened.
    /// Outside-click closing is now handled by
    /// `installOutsideClickMonitor()` / `handleOutsideClick(event:)`.
    func didResignKey() {
        // Intentionally a no-op now; outside-click monitor handles closing.
    }

    // MARK: - Window factory

    /// Creates the right `NSWindow` subclass (`NSPanel` for `.panel`,
    /// `NSWindow` otherwise).
    static func makeWindow(kind: WindowKind, frame: CGRect, styleMask: NSWindow.StyleMask) -> NSWindow {
        let window: NSWindow
        switch kind {
        case .panel:
            window = NSPanel(
                contentRect: frame,
                styleMask: styleMask,
                backing: .buffered,
                defer: false
            )
        case .window:
            window = NSWindow(
                contentRect: frame,
                styleMask: styleMask,
                backing: .buffered,
                defer: false
            )
        }
        // Programmatically created windows default to `isReleasedWhenClosed`,
        // Which under ARC over-releases a window held by a strong `let` the
        // Moment it closes. `teardown()` closes the window, so the
        // Flag has to go — the host's own reference is what keeps it alive,
        // And dropping that reference is what frees it.
        window.isReleasedWhenClosed = false
        return window
    }

    /// Resolves the entry URL for a module. Uses the provided `entryURL` if
    /// non-nil; otherwise resolves from `Bundle.main`.
    static func resolveEntryURL(module: ModuleId, entryURL: URL?) -> URL {
        guard let url = entryURL ?? Bundle.main.url(
            forResource: module.rawValue,
            withExtension: Constants.htmlFileExtension,
            subdirectory: Constants.webUIResourceSubdirectory
        ) else {
            fatalError("WKWebViewAppHost: missing WebUI/\(module.rawValue).html")
        }
        return url
    }

    // MARK: - WKWebView factory

    static func makeWebView() -> WKWebView {
        let config = WKWebViewConfiguration()
        let userContent = WKUserContentController()
        config.userContentController = userContent
        config.preferences.javaScriptCanOpenWindowsAutomatically = false

        let webView = WKWebView(frame: .zero, configuration: config)
        // Do not paint the web view's default opaque white backing layer.
        // The modules draw their own page background — the inlined critical
        // CSS paints the first frame, the theme stylesheet follows it, and
        // The tray window is transparent so its vibrancy material must show
        // Through while a page is still loading. With `drawsBackground` left
        // At its default the web view flashes white between the window
        // Appearing and the first committed page frame — the classic reopen
        // Flash. The property has no public setter on macOS, hence the KVC
        // Form.
        webView.setValue(false, forKey: "drawsBackground")
        webView.underPageBackgroundColor = .clear

        if #available(macOS 13.3, *) {
            #if DEBUG
            webView.isInspectable = true
            #else
            webView.isInspectable = false
            #endif
        }
        return webView
    }

    // MARK: - Window config application

    /// Applies the module-specific window configuration to the given window
    /// and web view. Returns the vibrancy view if installed, `nil` otherwise.
    static func apply(
        window: NSWindow,
        config: ModuleWindowConfiguration,
        webView: WKWebView
    ) -> NSVisualEffectView? {
        window.styleMask = config.styleMask
        // Apply the native minimum content size BEFORE restoring the autosaved
        // Frame so a persisted frame is clamped to the module's minimum.
        // Settings uses 800x640, matching the CSS `min-width`/`min-height`
        // In `App.pcss`. Modules with a `nil` minimum keep AppKit's default.
        if let contentMinSize = config.contentMinSize {
            window.contentMinSize = contentMinSize
        }
        // Center on the primary display when the config requests it.
        // Invoked AFTER `styleMask` so AppKit's
        // Centering algorithm uses the final titlebar height, and before
        // Setting `title` so the titlebar text is set after centering.
        // The order matches `apply`'s other setters with no observable
        // Difference.
        if config.centerOnScreen {
            window.center()
        }
        // Set the NSWindow titlebar text from `config.title`. The HTML
        // Entry page `<title>` only sets `document.title` inside the
        // WKWebView; it does NOT propagate to the NSWindow titlebar.
        // Without this, a `.titled` NSWindow shows an empty titlebar
        // Despite `.titleVisibility = .visible`. Tray's config uses
        // `.titleVisibility = .hidden`, hence `config.title == ""` is
        // A no-op there.
        window.title = config.title
        window.level = config.level
        if let key = config.frameAutosaveKey {
            window.setFrameAutosaveName(key)
        }
        window.isMovable = config.isMovable
        window.collectionBehavior = config.collectionBehavior
        window.titleVisibility = config.titleVisibility
        window.titlebarAppearsTransparent = config.titlebarAppearsTransparent

        if config.isTransparent {
            window.backgroundColor = .clear
            window.isOpaque = false
            webView.underPageBackgroundColor = .clear
        }

        guard let material = config.vibrancyMaterial else {
            // No vibrancy backing (e.g. the settings module, whose config
            // Has `vibrancyMaterial = nil`). Install the web view as the
            // Window's content view directly so it has a non-zero frame and
            // A superview. Without this the WKWebView keeps its default
            // Zero frame and no superview: the page still loads and its JS
            // Executes (so RPCs flow) but nothing paints, leaving the
            // Window blank even though it reports itself visible.
            let contentRect = window.contentView?.bounds ?? config.contentFrame
            webView.frame = contentRect
            webView.autoresizingMask = [.width, .height]
            window.contentView = webView
            return nil
        }

        let vibrancy = NSVisualEffectView(frame: config.contentFrame)
        vibrancy.material = material
        vibrancy.blendingMode = .behindWindow
        vibrancy.wantsLayer = true
        vibrancy.layer?.cornerRadius = config.cornerRadius ?? 0
        vibrancy.layer?.masksToBounds = true
        vibrancy.autoresizingMask = [.width, .height]
        window.contentView = vibrancy
        vibrancy.addSubview(webView)
        // Size the web view to fill the vibrancy. Without this the view
        // Retains its default zero frame: the page still loads and its JS
        // Executes (so RPCs flow), but nothing paints and the tray appears
        // Blank/invisible even though the window reports itself visible.
        webView.frame = vibrancy.bounds
        webView.autoresizingMask = [.width, .height]
        return vibrancy
    }
}

// MARK: - WKNavigationDelegate

extension WKWebViewAppHost: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        self.didFinishNavigation()
    }

    /// Navigation policy: allow only the module's own
    /// entry page; cancel every other navigation. Cancelled web
    /// destinations are handed to the external link gate; cancelled
    /// non-web destinations are logged and opened nowhere.
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        decisionHandler(
            self.navigationPolicy.decidePolicy(
                forNavigationTo: navigationAction.request.url
            )
        )
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        self.didFailProvisionalNavigation(error: error)
    }

    func webView(
        _ webView: WKWebView,
        didFail navigation: WKNavigation!,
        withError error: Error
    ) {
        // Non-provisional failure (e.g., a content-stage error after
        // Navigation started). Defers ENTIRELY to the existing
        // `didFailProvisionalNavigation(error:)` seam, which already
        // Performs: the `state` transition to `.error`, the
        // `logger.error` log, `pendingVisibilityChange = false`, and
        // The `failurePresenter.handleLoadFailure` call.
        // Intentionally does NOT invoke `failurePresenter` directly:
        // `didFailProvisionalNavigation(error:)` already routes to it,
        // So an additional call here would double-fire the alert
        // (review Finding 5).
        self.didFailProvisionalNavigation(error: error)
    }
}

// MARK: - NSWindowDelegate

extension WKWebViewAppHost: NSWindowDelegate {
    /// Intercepts the window's red close button, Cmd+W, and the
    /// "Close Window" menu item. Instead of letting AppKit `close()` the
    /// Window — which detaches the `WKWebView` from the window hierarchy
    /// And tears down its WebContent render-tree, so re-showing reuses a
    /// Stale `.shown` host whose page/process is dead (the
    /// EXC_BAD_ACCESS / kill-on-reopen bug) — hide the host via the
    /// Normal `hide()` / `show()` path that keeps the `WKWebView` alive
    /// While merely ordered out. Returning `false` cancels the AppKit
    /// Close.
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        // Permit the real close during teardown and after destruction.
        // `teardown()` itself uses `orderOut`, so this branch is only hit
        // When `close()` is invoked on a host that is already tearing down.
        guard self.state != .tearingDown, self.state != .destroyed else {
            return true
        }

        // The user-rules editor is a child window. Its red close button /
        // Cmd+W must NOT destroy it directly — the editor may have unsaved
        // Changes. Defer to the TS page: it checks `editorStore.isDirty`,
        // Shows the `UnsavedChangesModal` if needed, and calls the
        // `CloseUserRulesWindow` RPC (which tears the host down) once the
        // User resolves (Save / Discard) or immediately if clean. Returning
        // False cancels the AppKit close; the host stays alive until the RPC.
        if self.module == .userrules {
            // `window.__closeRequested` is only installed once the React page
            // Mounts. While still loading/errored/dead, `evaluateJavaScript`
            // Is a silent no-op, which would trap the user with an
            // Unclosable window — fall back to the native hide path instead.
            if self.state == .ready || self.state == .shown {
                self.webView.evaluateJavaScript(
                    "window.__closeRequested && window.__closeRequested()",
                    completionHandler: nil
                )
                return false
            }
            self.hide()
            return false
        }

        // Top-level modules hide on close (keeps the WKWebView process alive).
        self.hide()
        return false
    }
}
