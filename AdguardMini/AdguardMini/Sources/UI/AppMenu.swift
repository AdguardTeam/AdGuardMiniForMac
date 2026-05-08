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

extension AppMenu: SciterAppControllerDependent, EventBusDependent, UserSettingsManagerDependent {}

final class AppMenu: NSMenu, NSMenuItemValidation, NSMenuDelegate {
    // MARK: DI

    var sciterAppController: SciterAppsController!
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

    // MARK: Init

    init(title: String = .localized.base.app_displayed_name, menuType: MenuType = .main) {
        super.init(title: title)
        self.setupServices()

        self.delegate = self
        switch menuType {
        case .main:
            self.items = [self.mainMenu]
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
    }

    @objc
    private func preferencesHandler(_ sender: Any?) {
        self.sciterAppController.showApp(.settings)
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
