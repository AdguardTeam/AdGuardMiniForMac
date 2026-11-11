// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailPremiumStatusProvider.swift
//  AdguardMini
//

import Foundation

/// Whether a Premium license is active.
protocol MailPremiumStatusProvider {
    func isPremiumActive() async -> Bool
}
