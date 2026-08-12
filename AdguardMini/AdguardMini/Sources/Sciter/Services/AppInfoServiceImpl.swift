// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppInfoServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema

// MARK: - Constants

private enum Constants {
    static let channel: Channel = {
        #if STANDALONE
            switch BuildConfig.AG_CHANNEL {
            case "nightly":
                return .standaloneNightly
            case "beta":
                return .standaloneBeta
            case "release":
                return .standaloneRelease
            default:
                return .unknown
            }
        #else
            return .appStore
        #endif
    }()
}

extension Sciter.AppInfoServiceImpl:
    AppUpdaterDependent {
}

extension Sciter {
    final class AppInfoServiceImpl: AppInfoService.ServiceType {
        var appUpdater: AppUpdater!

        override init() {
            super.init()
            self.setupServices()
        }

        func getAbout(_ message: SciterSchema.EmptyValue, _ promise: @escaping (SciterSchema.AppInfo) -> Void) {
            let deps = ThirdPartyDependencies.deps.map { dep in
                ThirdPartyDependency(name: dep.name, version: dep.version)
            }
            let data = AppInfo(
                version: BuildConfig.AG_VERSION_TITLE,
                channel: Constants.channel,
                dependencies: deps,
                updateAvailable: self.appUpdater.isNewVersionAvailable
            )
            promise(data)
        }
    }
}
