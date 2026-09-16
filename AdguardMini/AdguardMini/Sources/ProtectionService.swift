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
    private let urlFilterService: URLFilterService

    var isProtectionEnabled: Bool {
        self.sharedSettingsStorage.protectionEnabled
    }

    init(
        serviceSupervisor: ServiceSupervisor,
        safariExtensionManager: SafariExtensionManager,
        sharedSettingsStorage: SharedSettingsStorage,
        statusBarItemController: StatusBarItemController,
        appMetadata: AppMetadata,
        urlFilterService: URLFilterService
    ) {
        self.serviceSupervisor = serviceSupervisor
        self.safariExtensionManager = safariExtensionManager
        self.sharedSettingsStorage = sharedSettingsStorage
        self.statusBarItemController = statusBarItemController
        self.appMetadata = appMetadata
        self.urlFilterService = urlFilterService
    }

    func startIfEnabled() async {
        if self.isProtectionEnabled {
            await self.serviceSupervisor.startAll()
        }
        // SWP converges in the background: settings/onboarding must not wait
        // For its NetworkExtension round-trips and retries.
        Task { await self.urlFilterService.reconcile() }
    }

    func setProtectionStatus(isEnabled: Bool) async {
        await self.performTransition(isEnabled: isEnabled)
    }

    private func performTransition(isEnabled: Bool) async {
        guard isEnabled != self.sharedSettingsStorage.protectionEnabled else { return }

        self.sharedSettingsStorage.protectionEnabled = isEnabled
        if isEnabled {
            await self.serviceSupervisor.startAll()
        } else {
            await self.serviceSupervisor.stopAll()
        }
        // The icon reflects the switch immediately and does not depend on the
        // Blocker reload or on SWP convergence.
        Task { @MainActor in
            await self.statusBarItemController.updateStatusBarIcon()
            await self.statusBarItemController.updateTrayIconVisibilityBySetting()
        }
        await self.safariExtensionManager.reloadAllContentBlockers()
        LogInfo("Protection: \(isEnabled ? "enabled" : "disabled")")
        // SWP follows the main switch without a paid license and intent, and
        // Logs its own failures. Detached: its retries must not delay the
        // Blockers, the icon, or the caller's reply.
        Task { await self.urlFilterService.reconcile() }
    }
}
