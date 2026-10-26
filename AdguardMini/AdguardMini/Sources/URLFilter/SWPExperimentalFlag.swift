// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SWPExperimentalFlag.swift
//  AdguardMini
//

import Foundation

// MARK: - SWPExperimentalFlag

// The resolution needs `nil` (unset) to stay distinct from `false`.
// swiftlint:disable discouraged_optional_boolean

/// Resolves the System-wide Protection experimental flag.
enum SWPExperimentalFlag {
    /// Resolves the flag from the stored choice, the channel, and the install state.
    /// - Parameters:
    ///   - storedValue: The user's explicit choice; `nil` while unset.
    ///   - channel: The build channel.
    ///   - isFilterInstalled: Whether a filter configuration exists.
    ///   - userIntent: Whether System-wide Protection is enabled.
    /// - Returns: The resolved flag value.
    static func isEnabled(
        storedValue: Bool?,
        channel: String = BuildConfig.AG_CHANNEL,
        isFilterInstalled: Bool,
        userIntent: Bool
    ) -> Bool {
        if let storedValue {
            return storedValue
        }
        switch channel {
        case BuildChannel.beta.rawValue, BuildChannel.nightly.rawValue:
            return true
        default:
            return isFilterInstalled || userIntent
        }
    }
}

// swiftlint:enable discouraged_optional_boolean

// MARK: - SWPExperimentalFlagStore

/// Persists the System-wide Protection experimental flag and resolves its effective value.
final class SWPExperimentalFlagStore {
    private let userDefaults: UserDefaults
    private let installedState: URLFilterInstalledStateProvider
    private let userIntentProvider: () -> Bool
    private let channel: String

    /// Creates the store.
    /// - Parameters:
    ///   - userDefaults: Storage for the explicit user choice.
    ///   - installedState: Provider of the current filter installation state.
    ///   - channel: Build channel used while no explicit choice is stored.
    ///   - userIntentProvider: Provider of the user's persisted System-wide Protection intent.
    init(
        userDefaults: UserDefaults = .standard,
        installedState: URLFilterInstalledStateProvider,
        channel: String = BuildConfig.AG_CHANNEL,
        userIntentProvider: @escaping () -> Bool
    ) {
        self.userDefaults = userDefaults
        self.installedState = installedState
        self.channel = channel
        self.userIntentProvider = userIntentProvider
    }

    /// The effective flag value.
    var isEnabled: Bool {
        SWPExperimentalFlag.isEnabled(
            storedValue: self.storedValue,
            channel: self.channel,
            isFilterInstalled: self.installedState.isFilterInstalled,
            userIntent: self.userIntentProvider()
        )
    }

    // The stored value needs `nil` (unset) to stay distinct from `false`.
    // swiftlint:disable discouraged_optional_boolean
    /// The explicitly stored choice; `nil` while the user has not chosen.
    var storedValue: Bool? {
        self.userDefaults.object(
            forKey: SettingsKey.experimentalSystemWideProtectionEnabled.rawValue
        ) as? Bool
    }
    // swiftlint:enable discouraged_optional_boolean

    /// Stores the explicit user choice.
    func setStoredValue(_ value: Bool) {
        self.userDefaults.set(
            value,
            forKey: SettingsKey.experimentalSystemWideProtectionEnabled.rawValue
        )
    }

    /// Removes the explicit choice so the channel default applies again.
    func reset() {
        self.userDefaults.removeObject(forKey: SettingsKey.experimentalSystemWideProtectionEnabled.rawValue)
    }
}
