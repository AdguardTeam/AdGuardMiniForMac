// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppUpdater.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - AppUpdater

protocol AppUpdater {
    var availableVersion: String? { get }
    var isNewVersionAvailable: Bool { get }

    func checkForUpdate(silentCheck: Bool)
}

// MARK: - AppUpdaterImpl

final class AppUpdaterImpl: NSObject, AppUpdater {
    private let eventBus: EventBus
    private var updaterController: UpdaterController!

    private(set) var availableVersion: String?

    var isNewVersionAvailable: Bool {
        !self.availableVersion.isNilOrEmpty
    }

    init(
        eventBus: EventBus
    ) {
        self.eventBus = eventBus
        super.init()

        let updater: UpdaterController = UpdaterControllerImpl(
            onFoundUpdate: { [weak self] in
                self?.onFoundUpdate(version: $0)
            },
            onDidntFindUpdate: { [weak self] in
                self?.onDidntFindUpdate()
            },
            onCancelUpdate: { [weak self] in
                self?.onCancelUpdate()
            },
            willShowUpdate: { [weak self] in
                if let self {
                    UIUtils.windowWillBeVisible(self)
                }
            }
        )
        self.updaterController = updater
        updater.setAutoUpdate(autoUpdate: true)
    }

    func checkForUpdate(silentCheck: Bool) {
        self.updaterController.checkForUpdate(silentCheck: silentCheck)
    }

    private func onFoundUpdate(version: String) {
        LogInfo("Update found: \(version)")
        self.availableVersion = version
        self.eventBus.post(event: .appVersionStatusResolved, userInfo: version)
    }

    private func onDidntFindUpdate() {
        LogInfo("Update didn't found")
        self.eventBus.post(event: .appVersionStatusResolved, userInfo: "")
    }

    private func onCancelUpdate() {
        LogInfo("Updated canceled")
        self.eventBus.post(event: .appVersionStatusResolved, userInfo: "")
        UIUtils.removeWindow(self)
    }
}
