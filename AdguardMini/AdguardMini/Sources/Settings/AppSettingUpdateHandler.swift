// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppSettingUpdateHandler.swift
//  AdguardMini
//

import Cocoa
import AML

// MARK: - TrayChangesDelegate

protocol TrayChangesDelegate: AnyObject {
    var statusBarItemIsHidden: Bool { get set }
}

// MARK: - TrayIconUpdatesHandler

protocol TrayIconUpdatesHandler {
    var trayChangesDelegate: TrayChangesDelegate? { get set }
}

// MARK: - AppSettingUpdateHandler

protocol AppSettingUpdateHandler: TrayIconUpdatesHandler {
    func handleUpdates(_ old: SettingsDTO, _ new: SettingsDTO)
    func handleAutoFiltersUpdateUpdates(_ old: Bool, _ new: Bool)
    func handleRealTimeFiltersUpdateUpdates(_ old: Bool, _ new: Bool)
    func handleDebugLoggingUpdates(_ old: Bool, _ new: Bool)
    func handleHardwareAccelerationUpdates(_ old: Bool, _ new: Bool)
    func handleShowInMenuUpdates(_ old: Bool, _ new: Bool)
    func handleThemeUpdates(_ old: Theme, _ new: Theme)
    func handleMailProtectionUpdates(_ old: Bool, _ new: Bool)
}

// MARK: - UserSettingUpdateHandlerImpl

final class AppSettingUpdateHandlerImpl {
    private let appLifecycle: AppLifecycleService
    private let safariPopupApi: SafariPopupApi
    private let updateService: FiltersUpdateService
    private let mailFiltersUpdater: MailFiltersUpdater

    weak var trayChangesDelegate: TrayChangesDelegate?

    init(
        appLifecycle: AppLifecycleService,
        safariPopupApi: SafariPopupApi,
        updateService: FiltersUpdateService,
        mailFiltersUpdater: MailFiltersUpdater
    ) {
        self.appLifecycle = appLifecycle
        self.safariPopupApi = safariPopupApi
        self.updateService = updateService
        self.mailFiltersUpdater = mailFiltersUpdater
    }
}

// MARK: - AppSettingUpdateHandler implementation

extension AppSettingUpdateHandlerImpl: AppSettingUpdateHandler {
    func handleUpdates(_ old: SettingsDTO, _ new: SettingsDTO) {
        guard old != new else { return }
        self.handleShowInMenuUpdates(old.showInMenuBar, new.showInMenuBar)

        self.handleAutoFiltersUpdateUpdates(old.autoFiltersUpdate, new.autoFiltersUpdate)
        self.handleRealTimeFiltersUpdateUpdates(old.realTimeFiltersUpdate, new.realTimeFiltersUpdate)

        self.handleDebugLoggingUpdates(old.debugLogging, new.debugLogging)
        self.handleHardwareAccelerationUpdates(old.hardwareAcceleration, new.hardwareAcceleration)
        self.handleMailProtectionUpdates(old.mailProtection, new.mailProtection)
    }

    func handleAutoFiltersUpdateUpdates(_ old: Bool, _ new: Bool) {
        guard old != new else { return }
        self.rescheduleFiltersUpdate()
    }

    func handleRealTimeFiltersUpdateUpdates(_ old: Bool, _ new: Bool) {
        guard old != new else { return }
        self.rescheduleFiltersUpdate()
    }

    private func rescheduleFiltersUpdate() {
        self.updateService.rescheduleTimer()
    }

    func handleDebugLoggingUpdates(_ old: Bool, _ new: Bool) {
        guard old != new else { return }

        let oldLogLevel: LogLevel = old ? .debug : .info
        let newLogLevel: LogLevel = new ? .debug : .info

        Logger.shared.logLevel = newLogLevel
        self.safariPopupApi.setLogLevel(newLogLevel)
        LogInfo("LogLevel changed from \(oldLogLevel) to \(newLogLevel)")
    }

    func handleHardwareAccelerationUpdates(_ old: Bool, _ new: Bool) {
        // Hardware acceleration feature is disabled
        // Keeping method for protocol compliance and future use
    }

    func handleShowInMenuUpdates(_ old: Bool, _ new: Bool) {
        guard old != new else { return }
        self.trayChangesDelegate?.statusBarItemIsHidden = !new
    }

    func handleThemeUpdates(_ old: Theme, _ new: Theme) {
        guard old != new else { return }
        self.safariPopupApi.setTheme(new)
        Task {
            await NSApplication.shared.setTheme(new)
        }
    }

    func handleMailProtectionUpdates(_ old: Bool, _ new: Bool) {
        guard old != new else { return }
        self.mailFiltersUpdater.updateMailFilters()
    }
}
