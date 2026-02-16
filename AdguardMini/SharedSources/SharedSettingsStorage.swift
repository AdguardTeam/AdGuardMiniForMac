// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SharedSettingsStorage.swift
//  AdguardMini
//

import Foundation
import AML

private enum Constants {
    static let defaultLaunchOnStartup = false
}

enum SharedSettingsKey: String, CaseIterable {
    case protectionEnabled       = "protectionEnabled"
    case launchOnStartup         = "launchOnStartup"
    case advancedRulesEnabled    = "advancedRules"
}

/// The storage responsible for working the settings available to all applications in the app group.
protocol SharedSettingsStorage: AnyObject {
    var sharedUserDefaults: UserDefaults { get }

    var protectionEnabled: Bool { get set }
    var launchOnStartup: Bool { get set }
    var advancedRules: Bool { get set }

    func resetStorage()
}

final class SharedSettingsStorageImpl: SharedSettingsStorage {
    // MARK: Public properties

    let sharedUserDefaults: UserDefaults

    var protectionEnabled: Bool {
        get {
            self.sharedUserDefaults.object(forKey: SharedSettingsKey.protectionEnabled.rawValue) as? Bool ?? true
        }
        set {
            self.sharedUserDefaults.set(newValue, forKey: SharedSettingsKey.protectionEnabled.rawValue)
        }
    }

    var launchOnStartup: Bool {
        get {
            self.sharedUserDefaults.object(forKey: SharedSettingsKey.launchOnStartup.rawValue)
            as? Bool
            ?? Constants.defaultLaunchOnStartup
        }
        set {
            self.sharedUserDefaults.set(newValue, forKey: SharedSettingsKey.launchOnStartup.rawValue)
        }
    }

    var advancedRules: Bool {
        get {
            self.sharedUserDefaults.object(forKey: SharedSettingsKey.advancedRulesEnabled.rawValue) as? Bool ?? true
        }
        set {
            self.sharedUserDefaults.set(newValue, forKey: SharedSettingsKey.advancedRulesEnabled.rawValue)
        }
    }

    init() {
        let userDefaults = UserDefaults(suiteName: BuildConfig.AG_GROUP)

        guard let userDefaults else {
            let message = "Cannot initialize User defaults for group"
            LogError(message)
            fatalError(message)
        }

        self.sharedUserDefaults = userDefaults
    }

    func resetStorage() {
        self.sharedUserDefaults.setPersistentDomain(
            [
                SharedSettingsKey.protectionEnabled.rawValue: true,
                SharedSettingsKey.launchOnStartup.rawValue: Constants.defaultLaunchOnStartup,
                SharedSettingsKey.advancedRulesEnabled.rawValue: true
            ],
            forName: BuildConfig.AG_GROUP
        )
    }
}
