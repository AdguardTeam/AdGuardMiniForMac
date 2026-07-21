// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Keychain.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - Constants

private enum Constants {
    static let successStatus: OSStatus = 0
}

// MARK: - Keychain

enum Keychain {
    static func set(key: KeychainKey.Base, value: String) async {
        _ = await Task.detached(priority: .userInitiated) {
            Self.set(key: key, value: value)
        }
        .result
    }

    static func set(key: KeychainKey.Base, value: String) {
        if let data = value.data(using: .utf8) {
            Self.set(key: key.key, data: data)
        } else {
            LogDebug("Can't convert \(value) to data")
        }
    }

    /// Saves data to keychain with optional access group for shared keychain.
    static func set(key: String, data: Data, accessGroup: String? = nil) {
        let status = KeyChain.save(key: key, value: data, accessGroup: accessGroup)
        if status != Constants.successStatus {
            LogError("Save to keychain \(key) OSStatus: \(status)")
        }
    }

    /// Saves data to shared keychain using the AG_GROUP access group.
    static func setShared(key: String, data: Data) {
        Self.set(key: key, data: data, accessGroup: BuildConfig.AG_GROUP)
    }

    /// Saves string value to shared keychain using the AG_GROUP access group.
    static func setShared(key: KeychainKey.Base, value: String) {
        if let data = value.data(using: .utf8) {
            Self.setShared(key: key.key, data: data)
        } else {
            LogDebug("Can't convert \(value) to data")
        }
    }

    static func delete(key: KeychainKey.Base) async {
        await Self.delete(key: key.key)
    }

    static func delete(key: KeychainKey.Secured) async {
        await Self.delete(key: key.key)
    }

    static func delete(key: String) async {
        _ = await Task.detached(priority: .userInitiated) {
            Self.delete(for: key)
        }
        .value
    }

    /// Deletes item from keychain with optional access group.
    static func delete(for key: String, accessGroup: String? = nil) {
        let status = KeyChain.delete(key: key, accessGroup: accessGroup)
        LogDebug("Remove from keychain \(key) status: \(status)")
    }

    /// Deletes item from shared keychain using the AG_GROUP access group.
    static func deleteShared(for key: String) {
        Self.delete(for: key, accessGroup: BuildConfig.AG_GROUP)
    }

    /// Loads data from keychain with optional access group.
    static func getValue(for key: String, accessGroup: String? = nil) async -> Data? {
        await Task(priority: .userInitiated) {
            Self.getValue(for: key, accessGroup: accessGroup)
        }.value
    }

    static func getValue(for key: String) async -> String? {
        await Task(priority: .userInitiated) {
            Self.getValue(for: key)
        }.value
    }

    static func getValue(for key: String) -> String? {
        if let data = KeyChain.load(key: key) {
            String(bytes: data, encoding: .utf8)
        } else {
            nil
        }
    }

    /// Loads data from keychain with optional access group.
    static func getValue(for key: String, accessGroup: String? = nil) -> Data? {
        KeyChain.load(key: key, accessGroup: accessGroup)
    }

    /// Loads data from shared keychain using the AG_GROUP access group.
    static func getValueShared(for key: String) -> Data? {
        Self.getValue(for: key, accessGroup: BuildConfig.AG_GROUP)
    }

    /// Loads string from shared keychain using the AG_GROUP access group.
    static func getValueShared(for key: String) -> String? {
        if let data = Self.getValueShared(for: key) as Data? {
            String(bytes: data, encoding: .utf8)
        } else {
            nil
        }
    }
}

// MARK: - KeychainKey

enum KeychainKey {
    enum Base: String {
        case applicationId
        case debugLogging
        case userActionLastDirectory
        case urlFilterEnabled
        case urlFilterProtectionLevelOption

        var key: String {
            makeKeyValue(for: self.rawValue)
        }
    }

    enum Secured: String {
        case licenseInfo

        var key: String {
            makeKeyValue(for: self.rawValue)
        }
    }

    private static func makeKeyValue(for key: String) -> String {
        "\(BuildConfig.AG_APP_ID).\(key)"
    }
}
