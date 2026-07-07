// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailProtectionStatusProvider.swift
//  AdguardMini
//

import Foundation

/// Mail Tracking Protection toggle state.
protocol MailProtectionStatusProvider {
    var mailProtection: Bool { get }
}
