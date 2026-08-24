// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SettingsServiceImpl.swift
//  AdguardMini
//

import Foundation
import ProtoSchema
import AML
import ContentBlockerConverter

private enum Constants {
    static let noUpdatesThreshold: TimeInterval = 7.days
    // Non-501 users indicate managed or multi-account scenarios; the URL filter is unavailable.
    // The actual UID can be overridden through devConfig ('url_filter_override_uid') to test it.
    // Setting it to 501 effectively disables the account check.
    static var isNon501User: Bool {
        let effectiveUID = DeveloperConfigUtils[.urlFilterOverrideUID] as? Int ?? Int(getuid())
        return effectiveUID != 501
    }
    static let isMacOS25OrLower: Bool = {
        if #available(macOS 26, *) {
            return false
        }
        return true
    }()
}

extension SettingsServiceImpl:
    ImportExportServiceDependent,
    UserSettingsServiceDependent,
    SupportDependent,
    AppResetServiceDependent,
    SystemInfoManagerDependent,
    StatisticsServiceDependent,
    WebViewAppsControllerDependent,
    AppLifecycleServiceDependent,
    AppMetadataDependent,
    HealthCheckAttentionProviderDependent,
    MailFiltersUpdaterDependent {}

final class SettingsServiceImpl: SettingsService.ServiceType {
    var importExportService: ImportExportService!
    var userSettingsService: UserSettingsService!
    var support: Support!
    var appResetService: AppResetService!
    var systemInfoManager: SystemInfoManager!
    var statisticsService: StatisticsService!
    var webViewAppsController: WebViewAppsController!
    var appLifecycleService: AppLifecycleService!
    var appMetadata: AppMetadata!
    var healthCheckAttentionProvider: HealthCheckAttentionProvider!
    var mailFiltersUpdater: MailFiltersUpdater!
    /// Native open/save panel presenter.
    var filePanelPresenter: FilePanelPresenting = NSFilePanelPresenter()

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

    /// Presents native open/save panel and grants selected path.
    func selectFile(_ message: SelectFileParams, _ promise: @escaping (SelectFilePath) -> Void) {
        Task { @MainActor in
            let picked = filePanelPresenter.present(params: message)
            if let path = picked {
                PathGrantStore.shared.grant(path)
            }
            var result = SelectFilePath()
            result.path = picked ?? ""
            promise(result)
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
        // Ack the RPC before termination begins so the reply reliably reaches
        // The web view (termination is scheduled on the main actor).
        promise(EmptyValue())
        self.appLifecycleService.terminate(restart: true)
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

    func getPromoDismissedCards(_ message: EmptyValue,
                                _ promise: @escaping (StringValueArray) -> Void) {
        var response = StringValueArray()
        response.value = self.userSettingsService.dismissedPromoCards
        promise(response)
    }

    func updatePromoDismissedCards(_ message: StringValueArray,
                                   _ promise: @escaping (EmptyValue) -> Void) {
        self.userSettingsService.dismissedPromoCards = message.value
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

        settings.non501User = Constants.isNon501User
        settings.macos25OrLower = Constants.isMacOS25OrLower
        promise(settings)
    }

    func exportSettings(_ message: Path, _ promise: @escaping (OptionalError) -> Void) {
        Task {
            let url = URL(fileURLWithPath: message.path).standardizedFileURL.resolvingSymlinksInPath()
            guard PathConfiner.isConfinable(
                url.path,
                granted: PathGrantStore.shared,
                containerRoots: PathConfiner.containerRoots(appGroupIdentifier: BuildConfig.AG_APP_ID)
            ) else {
                promise(.error("Invalid path"))
                LogError("exportSettings rejected: path not confined")
                return
            }
            do {
                try await self.importExportService.exportSettings(path: url.path)
                promise(OptionalError(hasError: false))
            } catch {
                LogError("Can't save data from \(message.path): \(error)")
                promise(OptionalError(hasError: true))
            }
        }
    }

    func importSettings(_ message: Path, _ promise: @escaping (EmptyValue) -> Void) {
        Task {
            let url = URL(fileURLWithPath: message.path).standardizedFileURL.resolvingSymlinksInPath()
            guard PathConfiner.isConfinable(
                url.path,
                granted: PathGrantStore.shared,
                containerRoots: PathConfiner.containerRoots(appGroupIdentifier: BuildConfig.AG_APP_ID)
            ) else {
                LogError("importSettings rejected: path not confined")
                promise(EmptyValue())
                return
            }
            promise(EmptyValue())
            await self.importExportService.fetchSettingsForImport(path: url.path)
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
            // Hide settings on main actor.
            await MainActor.run { self.webViewAppsController.hide(.settings) }
            _ = await self.appResetService.resetApp(request: false)
            let newSettings = self.userSettingsService.settings
            // Compute the stale-filters flag the same way `getSettings` does:
            // After a reset `lastFiltersUpdateTime` reverts to its distant-past
            // Default, so hardcoding `false` here would contradict it.
            let timeSinceLastFiltersUpdate = max(
                0,
                Date.now.timeIntervalSince(self.userSettingsService.lastFiltersUpdateTime)
            )
            promise(
                newSettings.toProto(
                    userConsent: self.userSettingsService.userConsent,
                    releaseVariant: ProductInfo.releaseVariant,
                    language: Locales.navigatorLang,
                    allowTelemetry: self.userSettingsService.allowTelemetry,
                    lastUpdateMoreSevenDays: timeSinceLastFiltersUpdate > Constants.noUpdatesThreshold,
                    loginItemEnabled: !self.healthCheckAttentionProvider.hasLoginItemDisabled()
                )
            )
        }
    }

    func exportLogs(_ message: Path, _ promise: @escaping (OptionalError) -> Void) {
        Task {
            let url = URL(fileURLWithPath: message.path).standardizedFileURL.resolvingSymlinksInPath()
            guard PathConfiner.isConfinable(
                url.path,
                granted: PathGrantStore.shared,
                containerRoots: PathConfiner.containerRoots(appGroupIdentifier: BuildConfig.AG_APP_ID)
            ) else {
                promise(.error("Invalid path"))
                LogError("exportLogs rejected: path not confined")
                return
            }
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
        promise(EmptyValue())
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
}
