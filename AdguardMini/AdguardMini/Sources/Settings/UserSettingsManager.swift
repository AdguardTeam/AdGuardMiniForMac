// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UserSettingsManager.swift
//  AdguardMini
//

import Foundation

// MARK: - UserSettingsManager protocol

protocol UserSettingsManager: UserSettingsProtocol {
    var quitReaction: QuitReaction { get set }
    var theme: Theme { get set }
    var currentUpdateChannel: String { get set }

    func registerUserDefaults(_ dict: [String: Any])
    func updatePersistentDomain(_ dict: [String: Any])
    func resetSettings()
}

// MARK: - UserSettingsManager class implementation

extension UserSettings: UserSettingsManager {
    private var preservedDict: [String: Any] {
        func rawOf(_ key: SettingsKey) -> String { key.rawValue }

        let defaults = UserDefaults.standard
        let wasMigratedFromLegacyAppKey = rawOf(.wasMigratedFromLegacyApp)
        let telemetryIdKey = rawOf(.telemetryId)
        let firstStartDateKey = rawOf(.firstStartDate)
        let migrationVersionKey = rawOf(.migrationVersion)

        var dict: [String: Any] = [
            rawOf(.updateChannel): self.currentUpdateChannel,
            wasMigratedFromLegacyAppKey: defaults.bool(forKey: wasMigratedFromLegacyAppKey)
        ]

        if let telemetryId = defaults.string(forKey: telemetryIdKey) {
            dict[telemetryIdKey] = telemetryId
        }

        if let firstStartDate = defaults.object(forKey: firstStartDateKey) as? Date {
            dict[firstStartDateKey] = firstStartDate
        }

        if let buildNumber = defaults.object(forKey: migrationVersionKey) as? Int {
            dict[migrationVersionKey] = buildNumber
        }

        return dict
    }

    var quitReaction: QuitReaction {
        get { QuitReaction(rawValue: self.quitOption) ?? .ask }
        set { self.quitOption = newValue.rawValue }
    }

    var theme: Theme {
        get { Theme(rawValue: self.themeOption) ?? .system }
        set { self.themeOption = newValue.rawValue }
    }

    var currentUpdateChannel: String {
        get {
            if self.updateChannel.isEmpty {
                self.updateChannel = BuildConfig.AG_CHANNEL
            }
            return self.updateChannel
        }
        set {
            self.updateChannel = newValue
        }
    }

    func registerUserDefaults(_ dict: [String: Any]) {
        UserDefaults.standard.register(defaults: dict)
    }

    func updatePersistentDomain(_ dict: [String: Any]) {
        UserDefaults.standard.setPersistentDomain(
            dict.merging(self.preservedDict) { _, new in new },
            forName: BuildConfig.AG_APP_ID
        )
    }

    func resetSettings() {
        self.updatePersistentDomain(self.preservedDict)
    }
}
