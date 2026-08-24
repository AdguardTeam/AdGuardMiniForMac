// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ModuleId.swift
//  AdguardMini
//

import Foundation

/**
 * Identifies a WKWebView-hosted UI module.
 */
enum ModuleId: String {
    case tray
    case settings
    case onboarding
    case userrules
}
