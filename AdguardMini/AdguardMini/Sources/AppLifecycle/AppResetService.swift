// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppResetService.swift
//  AdguardMini
//

import Foundation
import AppKit.NSAlert
import AML

// MARK: - AppResetService

protocol AppResetService {
    /// Reset App Data and restart App.
    /// - Parameter restart: Restart immediately after reset.
    /// - Parameter request: Use UI request.
    /// - Returns: False if user cancel reset.
    func resetApp(request: Bool) async -> Bool
}

// MARK: - AppResetServiceImpl

actor AppResetServiceImpl: AppResetService {
    private let lifecycle: AppLifecycleService

    private let sharedStorage: SharedSettingsStorage
    private let filtersSupervisor: FiltersSupervisor
    private let userSettings: UserSettingsService
    private let serviceSupervisor: ServiceSupervisor
    private let statisticsService: StatisticsService

    init(
        _ lifecycle: AppLifecycleService,
        _ sharedStorage: SharedSettingsStorage,
        _ filtersSupervisor: FiltersSupervisor,
        _ userSettings: UserSettingsService,
        _ serviceSupervisor: ServiceSupervisor,
        _ statisticsService: StatisticsService
    ) {
        self.lifecycle = lifecycle
        self.sharedStorage = sharedStorage
        self.filtersSupervisor = filtersSupervisor
        self.userSettings = userSettings
        self.serviceSupervisor = serviceSupervisor
        self.statisticsService = statisticsService
    }

    func resetApp(request: Bool) async -> Bool {
        LogInfo("Reset settings started.")

        if request {
            // 'async' call in an autoclosure that does not support concurrency
            // 'await' cannot appear to the right of a non-assignment operator
            if await !self.resetRequest() {
                LogInfo("User canceled operation.")
                return false
            }
        }

        LogInfo("User pressed 'confirm'.")

        await self.resetAppData()

        await self.processRestart()

        return true
    }

    private func resetAppData() async {
        await self.serviceSupervisor.stopAll()

        self.sharedStorage.resetStorage()
        await self.filtersSupervisor.reset()
        self.userSettings.resetSettings()
        self.statisticsService.resetStatistics()
    }

    private func resetRequest() async -> Bool {
        let alert = await AppAlert.resetRequest()
        let response = await alert.show()
        return (response == .alertSecondButtonReturn)
    }

    private func restartRequest() async -> Bool {
        let alert = await AppAlert.restartRequest()
        let response = await alert.show()
        return (response == .alertFirstButtonReturn)
    }

    @MainActor
    private func processRestart() async {
        let shouldRestart = await self.restartRequest()

        if shouldRestart {
            LogInfo("User selected to restart app.")
        } else {
            LogInfo("User selected to quit app.")
        }

        await self.lifecycle.terminate(restart: shouldRestart)
    }
}
