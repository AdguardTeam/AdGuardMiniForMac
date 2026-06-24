// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SciterAppsController.swift
//  AdguardMini
//

import Foundation

import AML
import SciterSwift

// MARK: - SciterAppsController

/// Responsible for high-level management of objects of type ``SciterApp``.
///
/// Provides a high-level interface to manage the various available applications ``AvailableSciterApp``,
/// encapsulates the low-level logic and brings it to the appropriate terminology.
protocol SciterAppsController {
    var isSciterConfigured: Bool { get }

    func configureAndLoadSciter(hardwareAcceleration: Bool)
    func shutdown()

    func startOnboarding() async
    func startMainApp(openSettings: Bool) async
    func showApp(_ appType: AvailableSciterApp)
    @MainActor
    func hideApp(_ appType: AvailableSciterApp) async
    func stopApp(_ appType: AvailableSciterApp)
    @MainActor
    func isAppHidden(_ appType: AvailableSciterApp) async -> Bool
    @MainActor
    func hasVisibleImportantApps() async -> Bool
}

// MARK: - SciterAppsControllerImpl

final class SciterAppsControllerImpl: SciterAppsController {
    private var onboarding: OnboardingApp { self.sciterAppLocator.onboardingApp }
    private var tray: TrayApp { self.sciterAppLocator.trayApp }
    private var settings: SettingsApp { self.sciterAppLocator.settingsApp }

    private let sciterAppLocator: SciterAppLocator
    private let sciterCallbackService: SciterCallbackService
    private let sciterOnboardingCallbackService: SciterOnboardingCallbackService
    private let protectionService: ProtectionService

    private let workQueue = DispatchQueue(
        label: "\(SciterAppsControllerImpl.self)-\(UUID().uuidString)",
        qos: .userInteractive
    )

    private var openSettingsOnStart: Bool = false
    private(set) var isSciterConfigured: Bool = false

    init(
        sciterAppLocator: SciterAppLocator,
        sciterCallbackService: SciterCallbackService,
        sciterOnboardingCallbackService: SciterOnboardingCallbackService,
        protectionService: ProtectionService,
    ) {
        self.sciterAppLocator = sciterAppLocator
        self.sciterCallbackService = sciterCallbackService
        self.sciterOnboardingCallbackService = sciterOnboardingCallbackService
        self.protectionService = protectionService
    }

    func configureAndLoadSciter(hardwareAcceleration: Bool) {
        self.workQueue.sync {
            guard !self.isSciterConfigured else {
                LogWarn("Already configured, ignoring")
                return
            }

            guard App.configureAndLoadBundle(
                hardwareAcceleration: hardwareAcceleration
            ) else {
                LogError("Failed to load Sciter bundle")
                fatalError("Can't load Sciter")
            }
            self.isSciterConfigured = true
            LogInfo("Sciter bundle loaded successfully")
        }
    }

    func shutdown() {
        self.workQueue.sync {
            guard self.isSciterConfigured else {
                LogWarn("Attempt to shutdown unconfigured Sciter")
                return
            }
            self.isSciterConfigured = false
            self.sciterAppLocator.stopAll()
            App.shutdown()
            LogInfo("Shutdown completed")
        }
    }

    func startOnboarding() async {
        guard self.checkSciterConfigured() else {
            LogWarn("Sciter not configured")
            return
        }
        self.openSettingsOnStart = false

        _ = await Task(priority: .userInitiated) { @MainActor in
            self.sciterCallbackService.stop()
            self.sciterOnboardingCallbackService.start()
            await self.onboarding.showWindow()
            LogInfo("Onboarding mode started")
        }.value
    }

    func startMainApp(openSettings: Bool = false) async {
        guard self.checkSciterConfigured() else {
            LogWarn("Sciter not configured")
            return
        }

        _ = await Task(priority: .userInitiated) { @MainActor in
            _ = self.tray

            // Workaround for a Sciter SDK bug (`sp-sciter-sdk`
            // `mac/6.0.3.18-rev-4`) on Intel macOS 12 / 13. Creating two
            // `SciterWindow` instances in rapid succession inside the same
            // `Task` causes either a SIGABRT or an `EXC_BAD_ACCESS` deep in
            // `sciter::om::asset<T>::~asset()` / `SAPI()`. The delay lets
            // `libsciter` settle before the second window is created.
            // TODO: Remove after updating `sp-sciter-sdk` (AG-55605).
            try? await Task.sleep(nanoseconds: 100_000_000) // 100ms

            _ = self.settings
            self.sciterOnboardingCallbackService.stop()
            self.sciterCallbackService.start()
            await self.protectionService.startIfEnabled()
            if self.openSettingsOnStart || openSettings {
                self.openSettingsOnStart = false
                await self.settings.showWindow()
            }
            LogInfo("Main Sciter app started")
        }.value
    }

    func showApp(_ appType: AvailableSciterApp) {
        guard self.checkSciterConfigured() else {
            LogDebug("showApp(\(appType)) - deferred, not configured")
            self.openSettingsOnStart = appType == .settings
            return
        }

        Task(priority: .userInitiated) { @MainActor in
            LogDebug("Window \(appType) became visible")
            switch appType {
            case .onboarding:
                await self.onboarding.showWindow()
            case .tray:
                await self.tray.showTrayWindow(forced: true)
            case .settings:
                await self.settings.showWindow()
            }
            LogDebug("Shown: \(appType)")
        }
    }

    @MainActor
    func hideApp(_ appType: AvailableSciterApp) async {
        guard self.checkSciterConfigured() else { return }

        switch appType {
        case .onboarding:
            await self.onboarding.hideWindow()
        case .tray:
            await self.tray.hideWindow()
        case .settings:
            await self.settings.hideWindow()
        }
        LogDebug("Hidden: \(appType)")
    }

    func stopApp(_ appType: AvailableSciterApp) {
        guard self.checkSciterConfigured() else { return }

        Task(priority: .userInitiated) { @MainActor in
            self.sciterAppLocator.stopApp(appType)
            LogDebug("Stopped: \(appType)")
        }
    }

    @MainActor
    func isAppHidden(_ appType: AvailableSciterApp) async -> Bool {
        guard self.checkSciterConfigured() else { return true }

        return switch appType {
        case .onboarding:
            self.onboarding.isAppHidden()
        case .tray:
            self.tray.isAppHidden()
        case .settings:
            self.settings.isAppHidden()
        }
    }

    @MainActor
    func hasVisibleImportantApps() async -> Bool {
        guard self.checkSciterConfigured() else { return false }

        let isOnboardingHidden = await self.isAppHidden(.onboarding)
        let isSettingsHidden = await self.isAppHidden(.settings)
        return !(isOnboardingHidden && isSettingsHidden)
    }

    private func checkSciterConfigured() -> Bool {
        self.workQueue.sync {
            self.isSciterConfigured
        }
    }
}
