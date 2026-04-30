// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SettingsServiceImpl.swift
//  AdguardMini
//

import Foundation
import SciterSchema
import AML
import SciterSwift
import AppKit
import SafariServices
import ServiceManagement
import ContentBlockerConverter

private enum Constants {
    static var loginItemUrl: URL {
        URL(string: "x-apple.systempreferences:com.apple.LoginItems-Settings.extension")!
    }
}

extension Sciter.SettingsServiceImpl:
    ImportExportServiceDependent,
    EventBusDependent,
    SafariExtensionStatusManagerDependent,
    UserSettingsServiceDependent,
    SafariExtensionStateServiceDependent,
    ProtectionServiceDependent,
    SupportDependent,
    AppResetServiceDependent,
    SystemInfoManagerDependent,
    AppUpdaterDependent,
    StatisticsServiceDependent,
    SciterAppControllerDependent,
    AppLifecycleServiceDependent,
    AppMetadataDependent {}

extension Sciter {
    final class SettingsServiceImpl: SettingsService.ServiceType {
        var importExportService: ImportExportService!
        var userSettingsService: UserSettingsService!
        var safariExtensionStatusManager: SafariExtensionStatusManager!
        var safariExtensionStateService: SafariExtensionStateService!
        var protectionService: ProtectionService!
        var support: Support!
        var appResetService: AppResetService!
        var systemInfoManager: SystemInfoManager!
        var appUpdater: AppUpdater!
        var statisticsService: StatisticsService!
        var eventBus: EventBus!
        var sciterAppController: SciterAppsController!
        var appLifecycleService: AppLifecycleService!
        var appMetadata: AppMetadata!

        override init() {
            super.init()
            self.setupServices()
        }

        func openLoginItemsSettings(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            if #available(macOS 13.0, *) {
                SMAppService.openSystemSettingsLoginItems()
            } else {
                NSWorkspace.shared.open(Constants.loginItemUrl)
            }
            promise(EmptyValue())
        }

        func getSafariExtensions(_ message: EmptyValue,
                                 _ promise: @escaping (SafariExtensions) -> Void) {
            Task {
                let safariExtensions = await self.safariExtensionStateService.getAllExtensionsStatus()
                let safariExtProto = safariExtensions.toProto()
                promise(safariExtProto)
            }
        }

        func getContentBlockersRulesLimit(_ message: EmptyValue, _ promise: @escaping (Int32Value) -> Void) {
            Task {
                let rulesLimit = SafariVersion.autodetect().rulesLimit
                promise(Int32Value(Int32(rulesLimit)))
            }
        }

        func updateLaunchOnStartup(_ message: BoolValue,
                                   _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.setLaunchOnStartup(message.value)
            promise(EmptyValue())
        }

        func updateShowInMenuBar(_ message: BoolValue,
                                 _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.setShowInMenuBar(message.value)
            promise(EmptyValue())
        }

        func updateHardwareAcceleration(_ message: BoolValue,
                                        _ promise: @escaping (EmptyValue) -> Void) {
            promise(EmptyValue())
            self.userSettingsService.setHardwareAcceleration(message.value)
        }

        func forceRestartOnHardwareAccelerationImport(_ message: EmptyValue,
                                                      _ promise: @escaping (EmptyValue) -> Void
        ) {
            self.appLifecycleService.terminate(restart: true)
            promise(EmptyValue())
        }

        func updateDebugLogging(_ message: BoolValue, _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.setDebugLogging(message.value)
            promise(EmptyValue())
        }

        func updateRealTimeFiltersUpdate(_ message: BoolValue,
                                         _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.setRealTimeFiltersUpdate(message.value)
            promise(EmptyValue())
        }

        func updateAutoFiltersUpdate(_ message: BoolValue,
                                     _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.setAutoFiltersUpdate(message.value)
            promise(EmptyValue())
        }

        func updateShowSafariToolbarBadge(_ message: BoolValue,
                                          _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.showSafariToolbarBadge = message.value
            promise(EmptyValue())
        }

        func getSettings(_ message: EmptyValue,
                         _ promise: @escaping (Settings) -> Void) {
            promise(
                self.userSettingsService.settings.toProto(
                    userConsent: self.userSettingsService.userConsent,
                    releaseVariant: ProductInfo.releaseVariant,
                    language: Locales.navigatorLang,
                    allowTelemetry: self.userSettingsService.allowTelemetry
                )
            )
        }

        func exportSettings(_ message: Path, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                do {
                    try await self.importExportService.exportSettings(path: message.path)
                    promise(OptionalError(hasError: false))
                } catch {
                    LogError("Can't save data from \(message.path): \(error)")
                    promise(OptionalError(hasError: true))
                }
            }
        }

        func importSettings(_ message: Path, _ promise: @escaping (EmptyValue) -> Void) {
            Task {
                promise(EmptyValue())
                await self.importExportService.fetchSettingsForImport(path: message.path)
            }
        }

        func importSettingsConfirm(_ message: ImportSettingsConfirmation, _ promise: @escaping (EmptyValue) -> Void) {
            Task {
                promise(EmptyValue())
                await self.importExportService.importSettings(message.mode.toSwift())
            }
        }

        func resetSettings(_ message: EmptyValue, _ promise: @escaping (Settings) -> Void) {
            Task {
                await self.sciterAppController.hideApp(.settings)
                _ = await self.appResetService.resetApp(request: false)
                let newSettings = self.userSettingsService.settings
                promise(
                    newSettings.toProto(
                        userConsent: self.userSettingsService.userConsent,
                        releaseVariant: ProductInfo.releaseVariant,
                        language: Locales.navigatorLang,
                        allowTelemetry: self.userSettingsService.allowTelemetry
                    )
                )
            }
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
                    theme: self.userSettingsService.theme.toProto()
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

        func openSafariExtensionPreferences(_ message: OptionalStringValue,
                                            _ promise: @escaping (OptionalError) -> Void) {
            Task {
                let identifier = if message.hasValue, !message.value.isEmpty {
                    message.value
                } else {
                    await self.safariExtensionStatusManager.firstDisabledExtensionId
                }

                var extensionId = SafariBlockerType.general.bundleId
                if let identifier {
                    extensionId = identifier
                } else {
                    // Very important message
                    // swiftlint:disable:next line_length
                    LogError("Attempting to open settings in a situation where no extension ID is specified and all extensions are active.")
                    assertionFailure("Unexpected nil identifier for Safari Extension")
                }

                do {
                    try await SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionId)
                    promise(OptionalError(hasError: false))
                } catch {
                    let message = "Failed to open safari preferences: \(error)"
                    promise(OptionalError(hasError: true, message: message))
                    LogError(message)
                }
            }
        }

        func exportLogs(_ message: Path, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                let url = URL(fileURLWithPath: message.path)
                _ = await self.support.generateLogsArchive(
                    fileUrl: url,
                    includeState: true,
                    shouldOpenFinder: false
                ) { error in
                    if let error {
                        let message = "Generate logs archive error: \(error)"
                        LogError(message)
                        promise(.error(message))
                        return
                    }
                    promise(.noError)
                }
            }
        }

        func updateQuitReaction(_ message: UpdateQuitReactionMessage, _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.quitReaction = message.reaction.toQuitReaction()
            promise(EmptyValue())
        }

        func checkApplicationVersion(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            // TODO: AG-32350
            // Here we should launch the check of version
            // Result should be provided in TrayCallbackService via OnApplicationVersionStatusResolved
            self.appUpdater.checkForUpdate(silentCheck: true)
            promise(EmptyValue())
        }

        func requestApplicationUpdate(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            // TODO: AG-32350
            // Here user request for update of application, we should handle, depending on distribution variant, open app store, or download it
            self.appUpdater.checkForUpdate(silentCheck: false)
            promise(EmptyValue())
        }

        func updateConsent(_ message: UserConsent, _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.userConsent = message.filtersIds.map(Int.init)
            promise(EmptyValue())
        }

        func requestOpenSettingsPage(_ message: StringValue, _ promise: @escaping (EmptyValue) -> Void) {
            self.eventBus.post(event: .settingsPageRequested, userInfo: message.value)
            promise(EmptyValue())
        }

        func sendFeedbackMessage(_ message: SupportMessage, _ promise: @escaping (OptionalError) -> Void) {
            Task.detached(priority: .userInitiated) {
                do {
                    try await self.support.sendFeedbackMessage(
                        email: message.email,
                        subject: message.theme,
                        description: message.message,
                        addLogs: message.addLogs
                    )
                    promise(.noError)
                } catch {
                    promise(.error("\(error)"))
                }
            }
        }

        func getUserActionLastDirectory(_ message: EmptyValue, _ promise: @escaping (StringValue) -> Void) {
            promise(StringValue(self.userSettingsService.userActionLastDirectory))
        }

        func updateUserActionLastDirectory(_ message: StringValue, _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.userActionLastDirectory = message.value
        }

        func getSystemLanguage(_ message: EmptyValue, _ promise: @escaping (StringValue) -> Void) {
            promise(StringValue(Locales.navigatorLang))
        }

        func getEffectiveTheme(_ message: EmptyValue, _ promise: @escaping (EffectiveThemeValue) -> Void) {
            Task {
                let theme = self.userSettingsService.theme
                await MainActor.run {
                    promise(.resolve(theme))
                }
            }
        }

        func updateTheme(_ message: UpdateThemeMessage, _ promise: @escaping (EmptyValue) -> Void) {
            Task {
                self.userSettingsService.setTheme(message.theme.toTheme())
                promise(EmptyValue())
            }
        }

        func updateAllowTelemetry(_ message: BoolValue, _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.allowTelemetry = message.value
            promise(EmptyValue())
        }

        func getStatistics(_ message: StatisticsRequest, _ promise: @escaping (StatisticsResponse) -> Void) {
            let period = message.period.toDomain()

            let adsBlocked = self.statisticsService.getAdsBlockedTotal(for: period)
            let privacyBlocked = self.statisticsService.getStatistics(for: period, blockerType: .privacy)

            let stats = BlockerStatistics(adsBlocked: adsBlocked, privacyBlocked: privacyBlocked)

            let response = StatisticsResponse(statistics: stats, period: message.period)
            promise(response)
        }

        func resetStatistics(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            self.statisticsService.resetStatistics()
            promise(EmptyValue())
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
