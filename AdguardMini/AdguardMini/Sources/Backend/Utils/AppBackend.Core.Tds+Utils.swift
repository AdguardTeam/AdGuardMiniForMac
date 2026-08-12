// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppBackend.Core.Tds+Utils.swift
//  AdguardMini
//

import AppBackend

extension AppBackend.Core.Tds {
    static func macMini(appid: String, from screen: String) -> Self {
        Self(
            action: nil,
            app: "mac-mini",
            appid: appid,
            from: screen,
            version: BuildConfig.AG_VERSION_TITLE
        )
    }
}
