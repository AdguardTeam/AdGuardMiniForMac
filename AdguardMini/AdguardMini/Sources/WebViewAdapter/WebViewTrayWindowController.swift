// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebViewTrayWindowController.swift
//  AdguardMini
//

import AppKit
import os

// MARK: - Constants

private enum Constants {
    static let bigSurDelay: TimeInterval = 0.25
}

/// Status-bar click handler for the WKWebView tray host.
final class WebViewTrayWindowController: StatusBarItemControllerDelegate,
    TrayChangesDelegate,
    TrayIconUpdatesHandlerDependent,
    UserSettingsManagerDependent {
    private let webViewAppsController: WebViewAppsController
    private var statusBarItemController: StatusBarItemController

    var trayIconUpdatesHandler: TrayIconUpdatesHandler!

    var userSettingsManager: UserSettingsManager!

    private var trayIconTemporarilyShown = false

    /// Logger for tray lifecycle diagnostics.
    private let logger = Logger(
        subsystem: Subsystem.mainApp.name,
        category: "WebViewTrayWindowController"
    )

    var statusBarItemIsHidden: Bool {
        get { !self.userSettingsManager.showInMenuBar }
        set {
            self.userSettingsManager.showInMenuBar = !newValue
            Task { @MainActor in
                await self.statusBarItemController.updateTrayIconVisibility(isHidden: newValue)
            }
        }
    }

    init(webViewAppsController: WebViewAppsController, statusBarItemController: StatusBarItemController) {
        self.webViewAppsController = webViewAppsController
        self.statusBarItemController = statusBarItemController
        self.setupServices()
        self.trayIconUpdatesHandler.trayChangesDelegate = self
    }

    /// Shows the status-bar icon and sets click delegate.
    @MainActor
    func start() async {
        self.statusBarItemController.delegate = self
        await self.statusBarItemController.updateStatusBarIcon()
    }

    @MainActor
    func showTrayWindow() async {
        // The host is created here but only shown several `await`s later, so
        // Without an intent the idle reaper could destroy it in between and
        // Turn this into a click that opens nothing.
        self.webViewAppsController.beginShowIntent(for: .tray)
        defer { self.webViewAppsController.endShowIntent(for: .tray) }

        if !self.userSettingsManager.showInMenuBar {
            self.trayIconTemporarilyShown = true
        }
        await self.statusBarItemController.updateTrayIconVisibility(isHidden: false)

        if self.webViewAppsController.host(for: .tray) == nil {
            self.webViewAppsController.prepareHost(for: .tray)
        }
        guard let host = self.webViewAppsController.host(for: .tray) else {
            logger.error("showTrayWindow — tray host missing after prepare, aborting")
            return
        }
        if self.statusBarItemIsHidden || self.trayIconTemporarilyShown {
            try? await Task.sleep(seconds: Constants.bigSurDelay)
        }
        await self.showTrayNearIcon(host: host)
    }

    @MainActor
    func restoreTrayIconVisibilityIfNeeded() async {
        guard self.trayIconTemporarilyShown else { return }
        self.trayIconTemporarilyShown = false
        await self.statusBarItemController.updateTrayIconVisibility(isHidden: !self.userSettingsManager.showInMenuBar)
    }

    /// Hides an already-open tray panel before the context menu is shown, so
    /// the menu is not presented over a still-open tray.
    func handleTrayContextMenuWillPresent() {
        Task { @MainActor in
            if let host = webViewAppsController.host(for: .tray), host.window.isVisible {
                host.hide()
            }
            await self.restoreTrayIconVisibilityIfNeeded()
        }
    }

    func handleStatusBarClicked(_ sender: NSStatusBarButton) {
        // All state access (`host(for:)`) is main-actor-bound; the `@objc`
        // Action fires on the main thread today, but keep the read inside
        // The task so the whole handler is uniformly isolated.
        Task { @MainActor in
            // Same reap race as `showTrayWindow()`: `showTrayNearIcon` awaits
            // The status-item rect between creating the host and showing it.
            self.webViewAppsController.beginShowIntent(for: .tray)
            defer { self.webViewAppsController.endShowIntent(for: .tray) }

            logger.error("tray click received — hostExists=\(self.webViewAppsController.host(for: .tray) != nil)")
            // Toggle an already-visible tray closed.
            if let host = webViewAppsController.host(for: .tray), host.window.isVisible {
                logger.error("tray already visible — hiding")
                host.hide()
                await self.restoreTrayIconVisibilityIfNeeded()
                return
            }

            // Lazily create host on first click.
            if webViewAppsController.host(for: .tray) == nil {
                logger.error("tray host missing — creating via show(.tray)")
                webViewAppsController.show(.tray)
            }

            guard let host = webViewAppsController.host(for: .tray) else {
                logger.error("tray host still nil after show — aborting")
                return
            }
            await self.showTrayNearIcon(host: host)
        }
    }

    @MainActor
    private func showTrayNearIcon(host: WKWebViewAppHost) async {
        let iconRect = await statusBarItemController.getTrayIconRect()
        // The status-bar icon may live on a secondary display (multi-display
        // Setups with "Displays have separate Spaces"); clamp against the
        // Screen that actually contains it, falling back to the first screen.
        // A `.zero` icon rect (button/window temporarily nil) is a hard bail
        // — clamping against (0, 0) would place the panel fully off-screen.
        guard iconRect != .zero,
              let screenRect = (NSScreen.screens.first { $0.frame.intersects(iconRect) }
                                ?? NSScreen.screens.first)?.frame else {
            logger.error("showTrayNearIcon — no usable screen/icon rect, aborting")
            return
        }
        var panelRect = host.window.frame
        panelRect.origin.x = iconRect.minX
        panelRect.origin.y = iconRect.minY - panelRect.height
        if panelRect.maxX > screenRect.maxX {
            panelRect.origin.x = iconRect.maxX - panelRect.width
        }
        host.window.setFrame(panelRect, display: true)
        logger.error("showTrayNearIcon — calling host.show() frame=\(panelRect.debugDescription, privacy: .public)")
        host.show()
        logger.error("showTrayNearIcon — host.show() returned, window.isVisible=\(host.window.isVisible)")
    }
}
