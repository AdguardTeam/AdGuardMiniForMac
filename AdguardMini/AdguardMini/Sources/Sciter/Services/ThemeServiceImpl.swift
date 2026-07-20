// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ThemeServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AML

extension Sciter.ThemeServiceImpl: UserSettingsManagerDependent {}

extension Sciter {
    final class ThemeServiceImpl: ThemeService.ServiceType {
        var userSettingsManager: UserSettingsManager!

        override init() {
            super.init()
            self.setupServices()
        }

        func getEffectiveTheme(_ message: EmptyValue, _ promise: @escaping (EffectiveThemeValue) -> Void) {
            Task { @MainActor in
                let theme = self.userSettingsManager.theme
                promise(.resolve(theme))
            }
        }
    }
}
