// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  EffectiveThemeValue+Utils.swift
//  AdguardMini
//

import BaseProtoSchema
import AML

extension EffectiveThemeValue {
    static func resolve(_ theme: Theme) -> EffectiveThemeValue {
        switch theme {
        case .system: .current
        case .light:  .light
        case .dark:   .dark
        }
    }

    private static var current: EffectiveThemeValue {
        UIUtils.isDarkMode() ? .dark : .light
    }
}
