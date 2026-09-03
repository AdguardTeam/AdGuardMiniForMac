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
    func showTrayIconTemporarily() async

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

    /// Reveals the status-bar icon even when the "show icon in menu bar"
    /// setting is off, so the tray popup can anchor under a real menu-bar
    /// slot. The icon is hidden again when the popup closes. It is never
    /// shown while first-run onboarding is in progress.
    @MainActor
    func showTrayIconTemporarily() async {
        await self.updateStatusBarIcon()
        self.statusBarItemView?.isVisible = self.isTrayIconVisibilityAllowed
    }

    @MainActor
    func getTrayIconRect() async -> CGRect {
        // Fast path: the icon is already laid out.
        if let rect = self.currentTrayIconRect {
            return rect
        }
        // An icon hidden by the user setting has no anchor and no layout to
        // Catch up on; bail before sleeping so a re-show cannot guess a
        // Screen-edge slot.
        guard self.isTrayIconItemVisible else {
            return .zero
        }

        // A visible icon can lag behind layout for a moment (fresh launch or
        // An app update) or fail to get a slot when the menu bar is full.
        // Wait briefly and retry so the popup opens under its real position.
        try? await Task.sleep(seconds: 0.25)
        if let rect = self.currentTrayIconRect {
            return rect
        }

        // Hiding can race the sleep above, so re-check before falling back.
        guard self.isTrayIconItemVisible else {
            return .zero
        }
        // Top-right anchor under the menu bar. Only a visible icon reaches
        // This fallback — one whose slot is still missing (no room in the
        // Tray, layout pending). `showTrayNearIcon`'s right-edge clamp
        // Right-aligns the popup.
        guard let screen = NSScreen.screens.first else {
            // No displays: `.zero` matches `showTrayNearIcon`'s hard bail.
            return .zero
        }
        let screenRect = screen.frame
        let size = CGSize(width: NSStatusItem.squareLength, height: NSStatusBar.system.thickness)
        return CGRect(
            x: screenRect.maxX - size.width,
            y: screenRect.maxY - size.height,
            width: size.width,
            height: size.height
        )
    }

    /// Whether the status-bar item exists and is currently on screen.
    @MainActor
    private var isTrayIconItemVisible: Bool {
        self.statusBarItemView?.isVisible ?? false
    }

    /// The status-bar icon's current on-screen rect, or `nil` when it is not
    /// visible or not laid out. A hidden icon's stale placeholder frame near
    /// the screen origin must never anchor the popup.
    @MainActor
    private var currentTrayIconRect: CGRect? {
        guard self.isTrayIconItemVisible,
              let rect = self.statusBarItemView?.globalRect,
              rect.width > 0, rect.height > 0 else {
            return nil
        }
        return rect
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
