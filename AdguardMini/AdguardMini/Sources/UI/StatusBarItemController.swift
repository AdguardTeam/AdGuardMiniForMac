// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  StatusBarItemController.swift
//  AdguardMini
//

import Foundation
import AppKit

import AML

// MARK: - StatusBarItemControllerDelegate

protocol StatusBarItemControllerDelegate: AnyObject {
    func handleStatusBarClicked(_ sender: NSStatusBarButton)
    func handleTrayContextMenuWillPresent()
}

extension StatusBarItemControllerDelegate {
    func handleTrayContextMenuWillPresent() {}
}

// MARK: - StatusBarItemController

protocol StatusBarItemController {
    var delegate: StatusBarItemControllerDelegate? { get set }

    func updateTrayIconVisibility(isHidden: Bool) async
    func updateTrayIconVisibilityBySetting() async
    func updateStatusBarIcon() async

    func getTrayIconRect() async -> CGRect

    func openContextMenu(_ sender: NSStatusBarButton)
}

// MARK: - StatusBarItemControllerImpl

final class StatusBarItemControllerImpl: StatusBarItemController {
    /// Status bar element.
    private var statusBarItemView: StatusBarItemView?

    private let storage: SharedSettingsStorage
    private let userSettingsManager: UserSettingsManager

    weak var delegate: StatusBarItemControllerDelegate?

    init(storage: SharedSettingsStorage, userSettingsManager: UserSettingsManager) {
        self.storage = storage
        self.userSettingsManager = userSettingsManager
    }

    @MainActor
    func updateTrayIconVisibility(isHidden: Bool) async {
        LogDebugTrace()
        if isHidden {
            self.statusBarItemView?.isVisible = false
            return
        }

        await self.updateStatusBarIcon()
    }

    /// Whether the tray icon may be shown at all. The icon must not appear
    /// while onboarding is in progress (first run) — it is shown only after
    /// onboarding completes.
    private var isTrayIconVisibilityAllowed: Bool {
        !self.userSettingsManager.firstRun
    }

    /// Updates the tray icon visibility according to the user setting (userSettingsManager.showInMenuBar)
    @MainActor
    func updateTrayIconVisibilityBySetting() async {
        LogDebug("Setting status bar icon visibility to \(self.userSettingsManager.showInMenuBar)")

        let isVisible = self.userSettingsManager.showInMenuBar && self.isTrayIconVisibilityAllowed
        self.statusBarItemView?.isVisible = isVisible
    }

    @MainActor
    func updateStatusBarIcon() async {
        LogDebug("Updating status bar icon")

        if self.statusBarItemView.isNil {
            LogDebug("Recreating status bar item")
            self.statusBarItemView = StatusBarItemView(
                statusItem: NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
            )
        }

        self.statusBarItemView?.image = NSImage(
            resource: self.storage.protectionEnabled
            ? .Tray.active
            : .Tray.inactive
        )
        self.statusBarItemView?.setTarget(self)
        self.statusBarItemView?.setAction(#selector(self.handleStatusBarClicked))
        self.statusBarItemView?.listenEvents([.leftMouseUp, .rightMouseUp])
        self.statusBarItemView?.isVisible = self.userSettingsManager.showInMenuBar
            && self.isTrayIconVisibilityAllowed
    }

    @MainActor
    func getTrayIconRect() async -> CGRect {
        if let rect = self.statusBarItemView?.globalRect, rect.width > 0, rect.height > 0 {
            return rect
        }
        // Right after launch (for example after an app update) the status item
        // May not be laid out yet. Wait a short moment and retry, so the popup
        // Opens under the real icon position instead of the screen corner.
        try? await Task.sleep(seconds: 0.25)
        if let rect = self.statusBarItemView?.globalRect, rect.width > 0, rect.height > 0 {
            return rect
        }
        // Safe fallback: center under the menu bar instead of the screen corner.
        let screenRect = NSScreen.screens[0].frame
        let size = CGSize(width: NSStatusItem.squareLength, height: NSStatusBar.system.thickness)
        return CGRect(
            x: (screenRect.width - size.width) / 2,
            y: screenRect.maxY - size.height,
            width: size.width,
            height: size.height
        )
    }

    func openContextMenu(_ sender: NSStatusBarButton) {
        LogDebug("Will open context menu")
        self.delegate?.handleTrayContextMenuWillPresent()
        let mainMenu = AppMenu(menuType: .context)
        self.statusBarItemView?.statusItem.menu = mainMenu
        sender.performClick(sender)
        self.statusBarItemView?.statusItem.menu = nil
    }

    @objc
    func handleStatusBarClicked(_ sender: NSStatusBarButton) {
        LogDebug("Handle status bar clicked by \(sender)")

        if let event = NSApp.currentEvent, event.isRightClickEquivalentEvent {
            self.openContextMenu(sender)
            return
        }

        self.delegate?.handleStatusBarClicked(sender)
    }
}
