// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SystemServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AppKit
import ServiceManagement

private enum Constants {
    static var loginItemUrl: URL {
        URL(string: "x-apple.systempreferences:com.apple.LoginItems-Settings.extension")!
    }
}

extension Sciter.SystemServiceImpl:
    SciterAppControllerDependent,
    EventBusDependent {}

extension Sciter {
    final class SystemServiceImpl: SystemService.ServiceType {
        var sciterAppController: SciterAppsController!
        var eventBus: EventBus!

        override init() {
            super.init()
            self.setupServices()
        }

        func requestOpenSettingsPage(_ message: StringValue, _ promise: @escaping (EmptyValue) -> Void) {
            if message.value == "tray_updates" {
                self.sciterAppController.showApp(.tray)
                self.eventBus.post(event: .trayPageRequested, userInfo: "updates")
            } else {
                self.eventBus.post(event: .settingsPageRequested, userInfo: message.value)
            }
            promise(EmptyValue())
        }

        func openLoginItemsSettings(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            if #available(macOS 13.0, *) {
                SMAppService.openSystemSettingsLoginItems()
            } else {
                NSWorkspace.shared.open(Constants.loginItemUrl)
            }
            promise(EmptyValue())
        }
    }
}
