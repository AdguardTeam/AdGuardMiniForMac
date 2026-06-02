// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TrayServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AML
import AppKit

extension Sciter.TrayServiceImpl:
    EventBusDependent,
    UserSettingsManagerDependent,
    UserSettingsServiceDependent,
    ProtectionServiceDependent,
    AppUpdaterDependent,
    StatisticsServiceDependent,
    SciterAppControllerDependent {}

extension Sciter {
    final class TrayServiceImpl: TrayService.ServiceType {
        var eventBus: EventBus!
        var userSettingsManager: UserSettingsManager!
        var userSettingsService: UserSettingsService!
        var protectionService: ProtectionService!
        var appUpdater: AppUpdater!
        var statisticsService: StatisticsService!
        var sciterAppController: SciterAppsController!

        override init() {
            super.init()
            self.setupServices()
        }

        func getTraySettings(_ message: EmptyValue,
                             _ promise: @escaping (GlobalSettings) -> Void) {
            Task {
                let traySettings = GlobalSettings(
                    enabled: self.protectionService.isProtectionEnabled,
                    newVersionAvailable: self.appUpdater.isNewVersionAvailable,
                    releaseVariant: ProductInfo.releaseVariant.toProto(),
                    language: Locales.navigatorLang,
                    debugLogging: self.userSettingsService.settings.debugLogging,
                    allowTelemetry: self.userSettingsService.allowTelemetry,
                    theme: self.userSettingsService.theme.toProto(),
                    lastFiltersUpdateTimestampMs: Int64(
                        max(0, self.userSettingsService.lastFiltersUpdateTime.timeIntervalSince1970 * 1000)
                    )
                )
                promise(traySettings)
            }
        }

        func updateTraySettings(_ message: GlobalSettings,
                                _ promise: @escaping (EmptyValue) -> Void) {
            Task {
                await self.protectionService.setProtectionStatus(isEnabled: message.enabled)
                LogDebug("Protection state: \(self.protectionService.isProtectionEnabled)")
                promise(EmptyValue())
            }
        }

        func getStatistics(_ message: StatisticsRequest, _ promise: @escaping (StatisticsResponse) -> Void) {
            let period = message.period.toDomain()

            let adsBlocked = self.statisticsService.getAdsBlockedTotal(for: period)
            let privacyBlocked = self.statisticsService.getStatistics(for: period, blockerType: .privacy)

            let stats = BlockerStatistics(adsBlocked: adsBlocked, privacyBlocked: privacyBlocked)

            let response = StatisticsResponse(statistics: stats, period: message.period)
            promise(response)
        }

        func requestOpenSettingsPage(_ message: StringValue, _ promise: @escaping (EmptyValue) -> Void) {
            if message.value == "tray_updates" {
                self.sciterAppController.showApp(.tray)
                self.eventBus.post(event: .trayPageRequested, userInfo: "updates")
            } else {
                self.eventBus.post(event: .settingsPageRequested, userInfo: message.value)
            }
            promise(EmptyValue())
        }

        func getEffectiveTheme(_ message: EmptyValue, _ promise: @escaping (EffectiveThemeValue) -> Void) {
            Task { @MainActor in
                let theme = self.userSettingsManager.theme
                promise(.resolve(theme))
            }
        }
    }
}

private extension SciterSchema.StatisticsPeriod {
    func toDomain() -> StatisticsPeriod {
        switch self {
        case .day: return .day
        case .week: return .week
        case .month: return .month
        case .year: return .year
        case .all: return .all
        case .UNRECOGNIZED: return .all
        }
    }
}
