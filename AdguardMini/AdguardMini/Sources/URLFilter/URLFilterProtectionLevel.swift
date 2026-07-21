// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterProtectionLevel.swift
//  AdguardMini
//

import Foundation

// MARK: - URLFilterProtectionLevel

/// The URL filter protection level selected by the user.
///
/// Persisted as its `Int` raw value via the existing settings storage.
enum URLFilterProtectionLevel: Int, Codable {
    case essential = 0
    case safe      = 1
    case family    = 2
}
