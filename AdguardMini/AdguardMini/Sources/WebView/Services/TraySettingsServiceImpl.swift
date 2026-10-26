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
    SystemInfoManagerDependent,
    StatisticsServiceDependent {}

/// `@unchecked Sendable` because the injected services are assigned once
/// during DI setup and only read afterwards.
final class TraySettingsServiceImpl: TraySettingsService.ServiceType, @unchecked Sendable {
    var protectionService: ProtectionService!
    var appUpdater: AppUpdater!
    var userSettingsService: UserSettingsService!
    var healthCheckAttentionProvider: HealthCheckAttentionProvider!
    var statisticsService: StatisticsService!
    var systemInfoManager: SystemInfoManager!

    override init() {
        super.init()
        self.setupServices()
    }

    func getTraySettings(_ message: EmptyValue,
                         _ promise: sending @escaping (GlobalSettings) -> Void) {
        // Services read here (user settings, updater, health-check provider)
        // And `setProtectionStatus` mutate shared state; keep access on the
        // Main actor like the sibling WebView services.
        Task { @MainActor in
            await self.userSettingsService.refreshExperimentalSystemWideProtectionState()
            let timeSinceLastFiltersUpdate = max(
                0,
                Date.now.timeIntervalSince(self.userSettingsService.lastFiltersUpdateTime)
            )
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
                ),
                hiddenStories: self.userSettingsService.hiddenStories,
                loginItemEnabled: !self.healthCheckAttentionProvider.hasLoginItemDisabled(),
                lastUpdateMoreSevenDays: timeSinceLastFiltersUpdate > Constants.noUpdatesThreshold,
                macos25OrLower: self.systemInfoManager.isMacOS25OrLower,
                experimentalSystemWideProtectionEnabled:
                    self.userSettingsService.experimentalSystemWideProtectionEnabled
            )
            promise(traySettings)
        }
    }

    func updateTraySettings(_ message: GlobalSettings,
                            _ promise: sending @escaping (EmptyValue) -> Void) {
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
