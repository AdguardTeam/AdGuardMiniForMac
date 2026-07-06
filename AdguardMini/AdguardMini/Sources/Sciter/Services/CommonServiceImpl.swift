// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  CommonServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AML
import AppKit

extension Sciter.CommonServiceImpl:
    SafariExtensionStateServiceDependent,
    EventBusDependent,
    UserSettingsServiceDependent,
    AppUpdaterDependent {}

extension Sciter {
    final class CommonServiceImpl: CommonService.ServiceType {
        var safariExtensionStateService: SafariExtensionStateService!
        var userSettingsService: UserSettingsService!
        var appUpdater: AppUpdater!
        var eventBus: EventBus!

        override init() {
            super.init()
            self.setupServices()
        }

        func getSafariExtensions(_ message: EmptyValue,
                                 _ promise: @escaping (SafariExtensions) -> Void) {
            Task {
                let safariExtensions = await self.safariExtensionStateService.getAllExtensionsStatus()
                let safariExtProto = safariExtensions.toProto()
                promise(safariExtProto)
            }
        }

        func checkApplicationVersion(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            // TODO: AG-32350
            // Here we should launch the check of version
            // Result should be provided in TrayCallbackService via OnApplicationVersionStatusResolved
            self.appUpdater.checkForUpdate(silentCheck: true)
            promise(EmptyValue())
        }

        func updateConsent(_ message: UserConsent, _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.userConsent = message.filtersIds.map(Int.init)
            promise(EmptyValue())
        }
    }
}
