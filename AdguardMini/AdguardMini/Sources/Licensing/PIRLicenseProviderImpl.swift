// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PIRLicenseProviderImpl.swift
//  AdguardMini
//

import Foundation

/// ``PIRLicenseProvider`` over the license state; App Store builds also use
/// the active subscription JWS.
final class PIRLicenseProviderImpl: PIRLicenseProvider {
    private let licenseStateProvider: LicenseStateProvider
    #if MAS
    private let appStoreInteractor: AppStoreInteractor
    #endif

    #if MAS
    init(
        licenseStateProvider: LicenseStateProvider,
        appStoreInteractor: AppStoreInteractor
    ) {
        self.licenseStateProvider = licenseStateProvider
        self.appStoreInteractor = appStoreInteractor
    }
    #else
    init(licenseStateProvider: LicenseStateProvider) {
        self.licenseStateProvider = licenseStateProvider
    }
    #endif

    func licenseCredential() async -> String {
        #if MAS
        // The active transaction is filtered to verified, current entitlements.
        // A lapsed subscription yields no JWS, so the stored key takes over.
        if let jws = await self.appStoreInteractor.latestActiveTransactionJWS() {
            return jws
        }
        #endif
        return await self.licenseStateProvider.getStoredInfo()?.applicationKey ?? ""
    }
}
