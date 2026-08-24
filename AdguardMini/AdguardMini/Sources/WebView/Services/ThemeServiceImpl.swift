// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ThemeServiceImpl.swift
//  AdguardMini
//

import Foundation
import ProtoSchema
import AML

extension ThemeServiceImpl: UserSettingsManagerDependent {}

final class ThemeServiceImpl: ThemeService.ServiceType {
    var userSettingsManager: UserSettingsManager!

    override init() {
        super.init()
        self.setupServices()
    }

    func getEffectiveTheme(_ message: EmptyValue, _ promise: @escaping (EffectiveThemeValue) -> Void) {
        // RPC messages arrive on the main thread and `resolve(.system)` reads
        // NSApp appearance (main-thread-only), so resolving synchronously is
        // Safe and avoids an unnecessary run-loop deferral.
        let theme = self.userSettingsManager.theme
        promise(.resolve(theme))
    }
}
