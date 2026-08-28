// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppMenu.swift
//  AdguardMini
//

import Cocoa
import AML

enum MenuType {
    case main
    case context
}

extension AppMenu: WebViewAppsControllerDependent, EventBusDependent, UserSettingsManagerDependent {}

final class AppMenu: NSMenu, NSMenuItemValidation, NSMenuDelegate {
    // MARK: DI

    var webViewAppsController: WebViewAppsController!
    var userSettingsManager: UserSettingsManager!
    var eventBus: EventBus!

    // MARK: UI

    private var aboutItem: NSMenuItem {
        NSMenuItem(
            title: .localized.base.app_menu_about_title,
            target: self,
            action: #selector(self.aboutHandler(_:)),
            keyEquivalent: ""
        )
    }

    private var preferencesItem: NSMenuItem {
        NSMenuItem(
            title: .localized.base.app_menu_preferences_title,
            target: self,
            action: #selector(self.preferencesHandler(_:)),
            keyEquivalent: ","
        )
    }

    private var hideItem: NSMenuItem {
        NSMenuItem(
            title: .localized.base.app_menu_hide_title,
            action: #selector(NSApplication.hide(_:)),
            keyEquivalent: "h"
        )
    }

    private var hideOthersItem: NSMenuItem {
        NSMenuItem(
            title: .localized.base.app_menu_hide_others_title,
            action: #selector(NSApplication.hideOtherApplications(_:)),
            keyEquivalent: "h",
            modifier: .init(arrayLiteral: [.command, .option])
        )
    }

    private var showAllItem: NSMenuItem {
        NSMenuItem(
            title: .localized.base.app_menu_show_all_title,
            action: #selector(NSApplication.unhideAllApplications(_:)),
            keyEquivalent: ""
        )
    }

    private var closeWindowItem: NSMenuItem {
        NSMenuItem(
            title: .localized.base.app_menu_close_title,
            action: #selector(NSApplication.shared.keyWindow?.performClose(_:)),
            keyEquivalent: "w"
        )
    }

    private var quitItem: NSMenuItem {
        NSMenuItem(
            title: .localized.base.app_menu_quit_title,
            target: self,
            action: #selector(self.terminationHandler(_:)),
            keyEquivalent: "q"
        )
    }

    private var menuItems: [NSMenuItem] {
        [
            self.aboutItem,
            NSMenuItem.separator(),
            self.preferencesItem,
            NSMenuItem.separator(),
            self.hideItem,
            self.hideOthersItem,
            self.showAllItem,
            NSMenuItem.separator(),
            self.closeWindowItem,
            NSMenuItem.separator(),
            self.quitItem
        ]
    }

    private var editMenuItems: [NSMenuItem] {
        EditMenuBuilder.makeItems(
            titles: EditMenuTitles(
                undo: .localized.base.app_menu_undo_title,
                redo: .localized.base.app_menu_redo_title,
                cut: .localized.base.app_menu_cut_title,
                copy: .localized.base.app_menu_copy_title,
                paste: .localized.base.app_menu_paste_title,
                delete: .localized.base.app_menu_delete_title,
                selectAll: .localized.base.app_menu_select_all_title
            )
        )
    }

    private var contextMenuItems: [NSMenuItem] {
        [
            self.aboutItem,
            self.preferencesItem,
            NSMenuItem.separator(),
            self.quitItem
        ]
    }

    private var mainMenu: NSMenuItem {
        let mainMenu = NSMenuItem()
        mainMenu.submenu = NSMenu()
        mainMenu.submenu?.items = self.menuItems
        return mainMenu
    }

    /// The Edit menu carries the standard editing key equivalents (Cmd+C,
    /// Cmd+V, Cmd+X, Cmd+A, Cmd+Z). WKWebView implements the `copy:`/`paste:`
    /// responder actions, but AppKit only recognizes the shortcuts when a
    /// matching menu item exists; without it Cmd+C/Cmd+V are swallowed
    /// everywhere in the WebView UI (paste still worked from WebKit's own
    /// context menu, which bypasses the app menu). Nil targets route each
    /// action through the responder chain to the focused WKWebView.
    private var editMenu: NSMenuItem {
        let editMenu = NSMenuItem()
        editMenu.submenu = NSMenu()
        editMenu.submenu?.items = self.editMenuItems
        return editMenu
    }

    // MARK: Init

    init(title: String = .localized.base.app_displayed_name, menuType: MenuType = .main) {
        super.init(title: title)
        self.setupServices()

        self.delegate = self
        switch menuType {
        case .main:
            self.items = [self.mainMenu, self.editMenu]
        case .context:
            self.items = self.contextMenuItems
        }
    }

    required init(coder: NSCoder) {
        super.init(coder: coder)
    }

    func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
        if menuItem.identifier == self.preferencesItem.identifier {
            return !self.userSettingsManager.firstRun
        }
        return true
    }

    // MARK: Private methods

    @objc
    private func aboutHandler(_ sender: Any?) {
        NSApplication.shared.orderFrontStandardAboutPanel()
        // Activate the app so the panel reaches the foreground: with the
        // `.accessory` policy the app is inactive when the panel opens from
        // The tray menu, and ordering alone leaves it behind other apps'
        // Windows. The `NSRunningApplication` call mirrors `UIUtils`, where
        // A single activation call is not enough on every system.
        if #available(macOS 14.0, *) {
            NSApplication.shared.activate()
        } else {
            NSApp.activate(ignoringOtherApps: true)
        }
        NSRunningApplication.current.activate(options: .activateIgnoringOtherApps)
    }

    @objc
    private func preferencesHandler(_ sender: Any?) {
        self.webViewAppsController.show(.settings)
        self.eventBus.post(event: .settingsWindowOpened, userInfo: nil)
    }

    @objc
    private func terminationHandler(_ sender: Any?) {
        (NSApplication.shared.delegate as? AppDelegate)?.performAppQuit()
    }
}

// MARK: - NSMenuItem convenience init

private extension NSMenuItem {
    convenience init(
        title string: String,
        target: AnyObject? = nil,
        action selector: Selector?,
        keyEquivalent charCode: String,
        modifier: NSEvent.ModifierFlags = .command
    ) {
        self.init(title: string, action: selector, keyEquivalent: charCode)
        keyEquivalentModifierMask = modifier
        self.target = target
    }
}
