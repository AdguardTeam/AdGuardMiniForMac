// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppInfoServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AML

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
            #if STANDALONE
                #if DEBUG || TEMP_DEV
                    let channel = Channel.unknown
                #elseif NIGHTLY
                    let channel = Channel.standaloneNightly
                #elseif BETA
                    let channel = Channel.standaloneBeta
                #elseif RELEASE
                    let channel = Channel.standaloneRelease
                #endif
            #else
                let channel = Channel.appStore
            #endif
            let deps = ThirdPartyDependencies.deps.map { dep in
                ThirdPartyDependency(name: dep.name, version: dep.version)
            }
            let data = AppInfo(
                version: BuildConfig.AG_DISPLAYED_VERSION,
                channel: channel,
                dependencies: deps,
                updateAvailable: self.appUpdater.isNewVersionAvailable
            )
            promise(data)
        }
    }
}
