// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppUpdateServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AML

extension Sciter.AppUpdateServiceImpl: AppUpdaterDependent {}

extension Sciter {
    final class AppUpdateServiceImpl: AppUpdateService.ServiceType {
        var appUpdater: AppUpdater!

        override init() {
            super.init()
            self.setupServices()
        }

        func checkApplicationVersion(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            self.appUpdater.checkForUpdate(silentCheck: true)
            promise(EmptyValue())
        }

        func requestApplicationUpdate(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            self.appUpdater.checkForUpdate(silentCheck: false)
            promise(EmptyValue())
        }
    }
}
