// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TrayApp.swift
//  AdguardMini
//

import Foundation
import AppKit.NSStatusItem

import AML
import SciterSwift
import SciterSchema

// MARK: - Constants

private enum Constants {
    /// The delay before the panel is drawn in seconds.
    ///
    /// Since macOS Big Sur 11 we need to wait a bit of time for the item to have time to get the correct coordinates on the screen.
    /// The need for delay is still present on macOS Sequoia 15.4.
    /// - Important: This is only relevant when the tray icon is hidden.
    static let bigSurDelay: TimeInterval = 0.25
}

// MARK: - TrayApp

extension TrayApp: InternalServiceDependent,
                   SettingsServiceDependent,
                   FiltersServiceDependent,
                   TrayCallbackServiceDependent,
                   AccountServiceDependent,
                   AdvancedBlockingServiceDependent,
                   TrayIconUpdatesHandlerDependent,
                   StatusBarItemControllerDependent,
                   UserSettingsManagerDependent,
                   TelemetrySciterServiceDependent,
                   TrayServiceDependent {}

#if MAS
extension TrayApp: AppStoreRateUsDependent {}
#endif

/// App that controls the tray window and its icon.
final class TrayApp: SciterApp, TrayChangesDelegate, StatusBarItemControllerDelegate {
    // MARK: Dependencies

    var trayIconUpdatesHandler: TrayIconUpdatesHandler!
    var statusBarItemController: StatusBarItemController!
    var userSettingsManager: UserSettingsManager!

    #if MAS
    var appStoreRateUs: AppStoreRateUs!
    #endif

    // MARK: Public

    var statusBarItemIsHidden: Bool {
        get { !self.userSettingsManager.showInMenuBar }
        set {
            self.userSettingsManager.showInMenuBar = !newValue
            Task { @MainActor in
                await self.statusBarItemController.updateTrayIconVisibility(isHidden: newValue)
            }
        }
    }

    // MARK: Overrides

    override init(
        windowRect: CGRect,
        archivePath: String,
        hideOnLoosingFocus: Bool,
        enableFrameAutosave: Bool
    ) {
        super.init(
            windowRect: windowRect,
            archivePath: archivePath,
            hideOnLoosingFocus: hideOnLoosingFocus,
            enableFrameAutosave: enableFrameAutosave
        )

        self.setupServices()

        if let window = self.nsWindow {
            window.titleVisibility = .hidden
            window.titlebarAppearsTransparent = true

            window.styleMask.insert(.fullSizeContentView)

            window.styleMask.remove(.closable)
            window.styleMask.remove(.fullScreen)
            window.styleMask.remove(.miniaturizable)
            window.styleMask.remove(.resizable)

            window.styleMask.insert(.nonactivatingPanel)

            window.isMovable = false

            window.level = .statusBar
            window.collectionBehavior = [.moveToActiveSpace, .fullScreenAuxiliary]
        }

        self.statusBarItemController.delegate = self

        Task { @MainActor in
            let firstRun = self.userSettingsManager.firstRun
            await self.statusBarItemController.updateTrayIconVisibility(
                isHidden: self.statusBarItemIsHidden || firstRun
            )
        }

#if UI_TESTS
        // In UI test builds, auto-show the tray window so that the
        // Sciter test peer (test-peer.js) can respond to TCP connections.
        // The tray window's event loop does not pump network I/O while
        // hidden, which prevents E2E tests from connecting.
        Task { @MainActor in
            try? await Task.sleep(seconds: 2.0)
            await self.showTrayWindow(forced: true)
        }
#endif

        self.trayIconUpdatesHandler.trayChangesDelegate = self
        LogInfo("Initialized")
    }

    @MainActor
    override func hideWindow() async {
        await super.hideWindow()
        await self.statusBarItemController.updateTrayIconVisibility(isHidden: self.statusBarItemIsHidden)

        Task {
            self.app.callback(TrayCallbackService.self).onTrayWindowVisibilityChange(
                BoolValue(false)
            )
        }
        LogDebug("Tray window hidden")
    }

    // MARK: Public methods

    /// Handle click on tray
    @objc func handleStatusBarClicked(_ sender: NSStatusBarButton) {
        guard let currentEvent = NSApp.currentEvent,
              let event = currentEvent.copy() as? NSEvent
        else { return }

        // Capture of 'event' with non-sendable type 'NSEvent' in a `@Sendable` closure, so do this here
        // It is not possible to check an event within a task, as other events often arrive during this time
        let isRightClickEquivalentEvent = event.isRightClickEquivalentEvent
        let isLeftMouseUpEvent = event.type == .leftMouseUp

        LogDebug("Handle status bar clicked with event: \(event), isRightClickEquivalentEvent: \(isRightClickEquivalentEvent), isLeftMouseUpEvent: \(isLeftMouseUpEvent)")

        Task { @MainActor in
            if isRightClickEquivalentEvent {
                await self.handleRightClick(sender)
            } else if isLeftMouseUpEvent {
                await self.handleLeftClick()
            } else {
                LogDebug("Ignoring unexpected event type: \(event.type)")
            }
        }
    }

    @MainActor
    func showTrayWindow(forced: Bool) async {
        if forced {
            await self.statusBarItemController.updateTrayIconVisibility(isHidden: false)
        }

        if self.statusBarItemIsHidden {
            try? await Task.sleep(seconds: Constants.bigSurDelay)
        }

        await self.openPanel()

        #if MAS
        self.appStoreRateUs.onWindowOpened()
        #endif

        Task {
            self.app.callback(TrayCallbackService.self).onTrayWindowVisibilityChange(
                BoolValue(true)
            )
        }
        LogDebug("Tray window shown (forced: \(forced))")
    }

    // MARK: Private methods

    @MainActor
    private func openPanel() async {
        guard let panel = self.nsWindow,
              let screenRect = NSScreen.screens.first?.frame
        else {
            LogError("No window or screen")
            return
        }

        let trayIconRect = await self.statusBarItemController.getTrayIconRect()

        var panelRect = panel.frame
        panelRect.origin.x = trayIconRect.minX
        panelRect.origin.y = trayIconRect.minY - panelRect.height

        if panelRect.maxX > screenRect.maxX {
            LogDebug("Panel exceeds screen bounds, adjusting position")
            panelRect.origin.x = trayIconRect.maxX - panelRect.width
        }

        LogDebug("Final panel rect: \(panelRect)")
        Task { [panelRect] in
            // First call to fix Tahoe (beta) window top most issue (AG-45839),
            // Second - to fix alert issue (AG-42588)
            NSApplication.shared.activate(ignoringOtherApps: true)
            NSRunningApplication.current.activate(options: .activateIgnoringOtherApps)
            await self.showWindowAtCoords(frame: panelRect)
        }
    }

    @MainActor
    private func handleLeftClick() async {
        let isVisible = self.nsWindow?.isVisible ?? false
        LogDebug("Handling left click, window visible: \(isVisible)")
        if isVisible {
            await self.hideWindow()
        } else {
            await self.showTrayWindow(forced: false)
        }
    }

    @MainActor
    private func handleRightClick(_ sender: NSStatusBarButton) async {
        LogDebug("Handling right click")
        await self.hideWindow()
        self.statusBarItemController.openContextMenu(sender)
    }
}
