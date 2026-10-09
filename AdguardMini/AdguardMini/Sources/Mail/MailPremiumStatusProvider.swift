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

final class MailPremiumStatusProviderImpl: MailPremiumStatusProvider {
    private let licenseStateProvider: LicenseStateProvider

    init(licenseStateProvider: LicenseStateProvider) {
        self.licenseStateProvider = licenseStateProvider
    }

    func isPremiumActive() async -> Bool {
        await self.licenseStateProvider.isPaid()
    }
}
