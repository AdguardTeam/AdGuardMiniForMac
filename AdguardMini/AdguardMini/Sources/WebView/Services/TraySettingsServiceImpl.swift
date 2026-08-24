// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TraySettingsServiceImpl.swift
//  AdguardMini
//

import Foundation
import ProtoSchema
import AML

private enum Constants {
    static let noUpdatesThreshold: TimeInterval = 7.days
}

extension TraySettingsServiceImpl:
    ProtectionServiceDependent,
    AppUpdaterDependent,
    UserSettingsServiceDependent,
    HealthCheckAttentionProviderDependent,
    StatisticsServiceDependent {}

final class TraySettingsServiceImpl: TraySettingsService.ServiceType {
    var protectionService: ProtectionService!
    var appUpdater: AppUpdater!
    var userSettingsService: UserSettingsService!
    var healthCheckAttentionProvider: HealthCheckAttentionProvider!
    var statisticsService: StatisticsService!

    override init() {
        super.init()
        self.setupServices()
    }

    func getTraySettings(_ message: EmptyValue,
                         _ promise: @escaping (GlobalSettings) -> Void) {
        // Services read here (user settings, updater, health-check provider)
        // And `setProtectionStatus` mutate shared state; keep access on the
        // Main actor like the sibling WebView services.
        Task { @MainActor in
            let timeSinceLastFiltersUpdate = max(
                0,
                Date.now.timeIntervalSince(self.userSettingsService.lastFiltersUpdateTime)
            )
            var traySettings = GlobalSettings(
                enabled: self.protectionService.isProtectionEnabled,
                newVersionAvailable: self.appUpdater.isNewVersionAvailable,
                releaseVariant: ProductInfo.releaseVariant.toProto(),
                language: Locales.navigatorLang,
                debugLogging: self.userSettingsService.settings.debugLogging,
                allowTelemetry: self.userSettingsService.allowTelemetry,
                theme: self.userSettingsService.theme.toProto(),
                lastFiltersUpdateTimestampMs: Int64(
                    max(0, self.userSettingsService.lastFiltersUpdateTime.timeIntervalSince1970 * 1000)
                ),
                loginItemEnabled: !self.healthCheckAttentionProvider.hasLoginItemDisabled(),
                lastUpdateMoreSevenDays: timeSinceLastFiltersUpdate > Constants.noUpdatesThreshold
            )
            traySettings.hiddenStories = self.userSettingsService.hiddenStories
            promise(traySettings)
        }
    }

    func updateTraySettings(_ message: GlobalSettings,
                            _ promise: @escaping (EmptyValue) -> Void) {
        Task { @MainActor in
            await self.protectionService.setProtectionStatus(isEnabled: message.enabled)
            self.userSettingsService.hiddenStories = message.hiddenStories
            promise(EmptyValue())
        }
    }

    func getStatistics(_ message: StatisticsRequest, _ promise: @escaping (StatisticsResponse) -> Void) {
        let period = message.period.toDomain()

        let adsBlocked = self.statisticsService.getAdsBlockedTotal(for: period)
        let privacyBlocked = self.statisticsService.getStatistics(for: period, blockerType: .privacy)

        let stats = BlockerStatistics(adsBlocked: adsBlocked, privacyBlocked: privacyBlocked)

        let response = StatisticsResponse(statistics: stats)
        promise(response)
    }
}

private extension ProtoSchema.StatisticsPeriod {
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
