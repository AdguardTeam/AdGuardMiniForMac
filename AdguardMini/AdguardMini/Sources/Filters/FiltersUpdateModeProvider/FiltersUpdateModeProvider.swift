// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FiltersUpdateModeProvider.swift
//  AdguardMini
//

import Foundation

// MARK: - FiltersUpdateModeProvider

protocol FiltersUpdateModeProvider: AnyObject {
    /// Computes current filters update mode based on user settings and license status.
    var currentMode: FiltersUpdateMode { get }
}

// MARK: - FiltersUpdateModeProviderImpl

/// Computes current filters update mode based on user settings and license status.
final class FiltersUpdateModeProviderImpl: FiltersUpdateModeProvider {
    // MARK: Private properties

    private let storage: UserSettingsManager
    private let keychain: KeychainManager

    // MARK: Public properties

    var currentMode: FiltersUpdateMode {
        let isLicenseActive = keychain.getAppStatusInfoSync()?.isPaid ?? false
        return FiltersUpdateMode.compute(
            realTime: self.storage.realTimeFiltersUpdate,
            auto: self.storage.autoFiltersUpdate,
            licenseActive: isLicenseActive
        )
    }

    init(storage: UserSettingsManager, keychain: KeychainManager) {
        self.storage = storage
        self.keychain = keychain
    }
}
