// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ProtectionService.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - ProtectionService

protocol ProtectionService {
    var isProtectionEnabled: Bool { get }
    func startIfEnabled() async
    func setProtectionStatus(isEnabled: Bool) async
}

// MARK: - ProtectionServiceImpl

final class ProtectionServiceImpl: ProtectionService {
    private let serviceSupervisor: ServiceSupervisor
    private let safariExtensionManager: SafariExtensionManager
    private let sharedSettingsStorage: SharedSettingsStorage
    private let statusBarItemController: StatusBarItemController
    private let appMetadata: AppMetadata

    var isProtectionEnabled: Bool {
        self.sharedSettingsStorage.protectionEnabled
    }

    init(
        serviceSupervisor: ServiceSupervisor,
        safariExtensionManager: SafariExtensionManager,
        sharedSettingsStorage: SharedSettingsStorage,
        statusBarItemController: StatusBarItemController,
        appMetadata: AppMetadata
    ) {
        self.serviceSupervisor = serviceSupervisor
        self.safariExtensionManager = safariExtensionManager
        self.sharedSettingsStorage = sharedSettingsStorage
        self.statusBarItemController = statusBarItemController
        self.appMetadata = appMetadata
    }

    func startIfEnabled() async {
        if self.isProtectionEnabled {
            await self.serviceSupervisor.startAll()
        }
    }

    func setProtectionStatus(isEnabled: Bool) async {
        guard isEnabled != self.sharedSettingsStorage.protectionEnabled else { return }

        self.sharedSettingsStorage.protectionEnabled = isEnabled
        if isEnabled {
            await self.serviceSupervisor.startAll()
        } else {
            await self.serviceSupervisor.stopAll()
        }
        await self.safariExtensionManager.reloadAllContentBlockers()
        Task { @MainActor in
            await self.statusBarItemController.updateStatusBarIcon()
            await self.statusBarItemController.updateTrayIconVisibilityBySetting()
        }
        LogInfo("Protection: \(isEnabled ? "enabled" : "disabled")")
    }
}
