// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SystemServiceImpl.swift
//  AdguardMini
//

import Foundation
import ProtoSchema
import AppKit
import ServiceManagement

import AML

private enum Constants {
    static var loginItemUrl: URL {
        URL(string: "x-apple.systempreferences:com.apple.LoginItems-Settings.extension")!
    }
}

extension SystemServiceImpl:
    TrayWindowControllerDependent,
    EventBusDependent {}

final class SystemServiceImpl: SystemService.ServiceType {
    var trayWindowController: WebViewTrayWindowController!
    var eventBus: EventBus!

    override init() {
        super.init()
        self.setupServices()
    }

    func requestOpenSettingsPage(_ message: StringValue, _ promise: @escaping (EmptyValue) -> Void) {
        // Both branches mutate `NSWindow` / post events; run uniformly on the
        // Main actor (the RPC arrives on a background delivery queue).
        Task { @MainActor in
            if message.value == "tray_updates" {
                // The tray popover has no stable "default" frame — a raw
                // `show(.tray)` would place a fresh host at the corner frame.
                // Route through the positioned show (anchored under the
                // Status-bar icon), then navigate the tray to its updates page.
                if let trayWindowController = self.trayWindowController {
                    await trayWindowController.showTrayWindow()
                    self.eventBus.post(event: .trayPageRequested, userInfo: "updates")
                } else {
                    LogError("SystemService: tray window controller not set, tray show skipped")
                }
            } else {
                self.eventBus.post(event: .settingsPageRequested, userInfo: message.value)
            }
            // Resolve the promise inside the Task, after the UI work, so the
            // Ack means "done" (matches `InternalServiceImpl.openSettingsWindow`).
            promise(EmptyValue())
        }
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
