// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailPremiumStatusProviderImpl.swift
//  AdguardMini
//

import Foundation

/// Reads the Premium status from the shared license state.
final class MailPremiumStatusProviderImpl: MailPremiumStatusProvider {
    private let licenseStateProvider: LicenseStateProvider

    init(licenseStateProvider: LicenseStateProvider) {
        self.licenseStateProvider = licenseStateProvider
    }

    func isPremiumActive() async -> Bool {
        await self.licenseStateProvider.isPaid()
    }
}
