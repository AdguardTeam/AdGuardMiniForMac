// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ConsentServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AML

extension Sciter.ConsentServiceImpl: UserSettingsServiceDependent {}

extension Sciter {
    final class ConsentServiceImpl: ConsentService.ServiceType {
        var userSettingsService: UserSettingsService!

        override init() {
            super.init()
            self.setupServices()
        }

        func updateAllowTelemetry(_ message: BoolValue, _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.allowTelemetry = message.value
            promise(EmptyValue())
        }

        func updateConsent(_ message: UserConsent, _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.userConsent = message.filtersIds.map(Int.init)
            promise(EmptyValue())
        }
    }
}
