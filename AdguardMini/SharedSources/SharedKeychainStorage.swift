// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SharedKeychainStorage.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - Constants

private enum Constants {
    static let defaultUrlFilterEnabled = false
    static let defaultUrlFilterProtectionLevelOption = 0
}

// MARK: - SharedKeychainStorage

/// Storage for settings that are persisted in the shared Keychain (App Group).
///
/// Separated from ``SharedSettingsStorage`` so that targets which only need a
/// few Keychain-backed values (e.g. URL filter properties) do not have to pull
/// in the full ``SharedSettingsStorage`` and its dependencies.
protocol SharedKeychainStorage: AnyObject {
    /// Raw integer value of the selected protection level.
    var urlFilterProtectionLevelOption: Int { get set }

    /// Removes all Keychain items owned by this storage.
    func reset()
}

// MARK: - SharedKeychainStorageImpl

final class SharedKeychainStorageImpl: SharedKeychainStorage {
    var urlFilterProtectionLevelOption: Int {
        get {
            let value: String? = Keychain.getValueShared(
                for: KeychainKey.Base.urlFilterProtectionLevelOption.key
            )
            guard let value,
                  let intValue = Int(value) else { return Constants.defaultUrlFilterProtectionLevelOption }
            return intValue
        }
        set {
            Keychain.setShared(
                key: KeychainKey.Base.urlFilterProtectionLevelOption.key,
                data: Data("\(newValue)".utf8)
            )
        }
    }

    func reset() {
        Keychain.deleteShared(for: KeychainKey.Base.urlFilterEnabled.key)
        Keychain.deleteShared(for: KeychainKey.Base.urlFilterProtectionLevelOption.key)
    }
}
