// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppInfoServiceImpl.swift
//  AdguardMini
//

import Foundation
import ProtoSchema
import AML

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

extension AppInfoServiceImpl:
    AppUpdaterDependent {
}

final class AppInfoServiceImpl: AppInfoService.ServiceType {
    var appUpdater: AppUpdater!

    override init() {
        super.init()
        self.setupServices()
    }

    func getAbout(_ message: EmptyValue, _ promise: @escaping (AppInfo) -> Void) {
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
