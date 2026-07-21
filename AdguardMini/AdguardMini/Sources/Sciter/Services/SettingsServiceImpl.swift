// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SettingsServiceImpl.swift
//  AdguardMini
//

// swiftlint:disable file_length

import Foundation
import SciterSchema
import AML
import SciterSwift
import ContentBlockerConverter

private enum Constants {
    static let noUpdatesThreshold: TimeInterval = 7.days
    // UID 501 is macOS's default UID for the first admin account created during initial setup.
    // Non-501 users indicate managed or multi-account scenarios.
    static let isNon501User: Bool = getuid() != 501
}

extension Sciter.SettingsServiceImpl:
    ImportExportServiceDependent,
    UserSettingsServiceDependent,
    SupportDependent,
    AppResetServiceDependent,
    SystemInfoManagerDependent,
    StatisticsServiceDependent,
    SciterAppControllerDependent,
    AppLifecycleServiceDependent,
    AppMetadataDependent,
    HealthCheckAttentionProviderDependent,
    MailFiltersUpdaterDependent {}

extension Sciter {
    final class SettingsServiceImpl: SettingsService.ServiceType {
        var importExportService: ImportExportService!
        var userSettingsService: UserSettingsService!
        var support: Support!
        var appResetService: AppResetService!
        var systemInfoManager: SystemInfoManager!
        var statisticsService: StatisticsService!
        var sciterAppController: SciterAppsController!
        var appLifecycleService: AppLifecycleService!
        var appMetadata: AppMetadata!
        var healthCheckAttentionProvider: HealthCheckAttentionProvider!
        var mailFiltersUpdater: MailFiltersUpdater!

        override init() {
            super.init()
            self.setupServices()
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

        func getHealthCheckDismissedCards(_ message: EmptyValue,
                                          _ promise: @escaping (StringValueArray) -> Void) {
            var response = StringValueArray()
            response.value = self.userSettingsService.dismissedHealthCheckCards
            promise(response)
        }

        func updateHealthCheckDismissedCards(_ message: StringValueArray,
                                             _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.dismissedHealthCheckCards = message.value
            promise(EmptyValue())
        }

        func getSettings(_ message: EmptyValue,
                         _ promise: @escaping (Settings) -> Void) {
            let timeSinceLastFiltersUpdate = max(
                0,
                Date.now.timeIntervalSince(self.userSettingsService.lastFiltersUpdateTime)
            )
            var settings = self.userSettingsService.settings.toProto(
                userConsent: self.userSettingsService.userConsent,
                releaseVariant: ProductInfo.releaseVariant,
                language: Locales.navigatorLang,
                allowTelemetry: self.userSettingsService.allowTelemetry,
                lastUpdateMoreSevenDays: timeSinceLastFiltersUpdate > Constants.noUpdatesThreshold,
                loginItemEnabled: !self.healthCheckAttentionProvider.hasLoginItemDisabled()
            )

            if let geometry = self.userSettingsService.userRulesEditorGeometry {
                settings.userRulesEditorGeometry = geometry.toProto()
            }
            settings.non501User = Constants.isNon501User
            promise(settings)
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
                        allowTelemetry: self.userSettingsService.allowTelemetry,
                        lastUpdateMoreSevenDays: false,
                        loginItemEnabled: !self.healthCheckAttentionProvider.hasLoginItemDisabled()
                    )
                )
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

        func updateTheme(_ message: UpdateThemeMessage, _ promise: @escaping (EmptyValue) -> Void) {
            Task {
                self.userSettingsService.setTheme(message.theme.toTheme())
                promise(EmptyValue())
            }
        }

        func resetStatistics(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            self.statisticsService.resetStatistics()
            promise(EmptyValue())
        }

        func updateUserRulesEditorGeometry(_ message: WindowGeometry,
                                           _ promise: @escaping (EmptyValue) -> Void) {
            self.userSettingsService.userRulesEditorGeometry = message.toWindowGeometryDTO()
            promise(EmptyValue())
        }
    }
}

// swiftlint:enable file_length
