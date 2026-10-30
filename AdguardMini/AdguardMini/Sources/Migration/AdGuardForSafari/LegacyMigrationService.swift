// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LegacyMigrationService.swift
//  AdguardMini
//

import Foundation

import AML
import FLM

// MARK: - Constants

private enum Constants {
    static var configPath: String { "AdGuardSafariApp/config.json" }
    static var settingsFilePath: String { "Library/Application Support/\(Self.configPath)" }

    #if MAS
    /// App Group container URL for MAS build.
    static var appGroupSettingsURL: URL? {
        FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: BuildConfig.AG_APP_ID)?
            .appendingPathComponent(Self.settingsFilePath)
    }

    /// Sandbox Application Support URL for MAS build.
    static var sandboxSettingsURL: URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?
            .appendingPathComponent(Self.configPath)
    }

    #else

    /// Standalone URL for non-MAS build.
    static var standaloneSettingsURL: URL {
        URL(fileURLWithPath: FileManager.realHomeDirectoryPath.appendingPathComponent(Self.settingsFilePath))
    }

    #endif

    /// ID of the old large annoyance filter, which was divided into 5 constituent filters.
    static var legacyAnnoyancesFilterId: Int { 14 }
}

// MARK: - LegacyMigrationServiceError

enum LegacyMigrationServiceError: Error {
    case cantWorkWithDb
}

// MARK: - LegacyMigrationService

/// `Sendable` because the implementation holds only immutable collaborators.
protocol LegacyMigrationService: Sendable {
    func tryMigrate() async throws -> Bool
}

// MARK: - LegacyMigration.MigrationServiceImpl

extension Legacy {
    /// Service for the migration from the legacy AdGuard for Safari app to the new AdGuard Mini for Mac app.
    /// `@unchecked Sendable` because every stored property is an immutable
    /// collaborator.
    final class MigrationServiceImpl: @unchecked Sendable {
        private static let logPrefix = "[Legacy Migration] "

        private let appSettings: UserSettingsService
        private let sharedSettings: SharedSettingsStorage
        private let filtersSupervisor: FiltersSupervisor
        private let appMetadata: AppMetadata
        private let mapper: LegacyMapper

        init(
            ruleBuilder: AllowBlockListRuleBuilder,
            appSettings: UserSettingsService,
            sharedSettings: SharedSettingsStorage,
            filtersSupervisor: FiltersSupervisor,
            appMetadata: AppMetadata,
            mapper: LegacyMapper
        ) {
            self.appSettings = appSettings
            self.sharedSettings = sharedSettings
            self.filtersSupervisor = filtersSupervisor
            self.appMetadata = appMetadata
            self.mapper = mapper
        }

        // MARK: - Logging helpers

        private func logInfo(
            _ message: @autoclosure () -> String,
            file: String = #fileID,
            function: String = #function,
            line: UInt = #line
        ) {
            LogInfo("\(Self.logPrefix)\(message())", file: file, function: function, line: line)
        }

        private func logWarn(
            _ message: @autoclosure () -> String,
            file: String = #fileID,
            function: String = #function,
            line: UInt = #line
        ) {
            LogWarn("\(Self.logPrefix)\(message())", file: file, function: function, line: line)
        }

        private func logError(
            _ message: @autoclosure () -> String,
            file: String = #fileID,
            function: String = #function,
            line: UInt = #line
        ) {
            LogError("\(Self.logPrefix)\(message())", file: file, function: function, line: line)
        }

        private func logDebug(
            _ message: @autoclosure () -> String,
            file: String = #fileID,
            function: String = #function,
            line: UInt = #line
        ) {
            LogDebug("\(Self.logPrefix)\(message())", file: file, function: function, line: line)
        }

        // MARK: - Private methods

        /// Returns the full URL to the settings file if it exists.
        ///
        /// # MAS
        /// Checks App Group first, then fallback to Application Support in sandbox:
        /// 1. ~/Library/Group Containers/TC3Q7MAJXF.com.adguard.safari.AdGuard/Library/Application Support/AdGuardSafariApp/config.json
        /// 2. ~/Library/Containers/com.adguard.safari.AdGuard/Data/Library/Application Support/AdGuardSafariApp/config.json
        ///
        /// # Standalone
        /// Checks ~/Library/Application Support/AdGuardSafariApp/config.json.
        private func getSettingsFile() -> URL? {
        #if MAS
            let fileManager = FileManager.default

            // Path 1: App Group container
            if let appGroupURL = Constants.appGroupSettingsURL {
                self.logInfo("Checking App Group path: \(appGroupURL.path)")
                if fileManager.fileExists(atPath: appGroupURL.path) {
                    self.logInfo("Found settings file in App Group")
                    return appGroupURL
                }
            }

            // Path 2: Application Support in sandbox
            if let sandboxURL = Constants.sandboxSettingsURL {
                self.logInfo("Checking sandbox Application Support path: \(sandboxURL.path)")
                if fileManager.fileExists(atPath: sandboxURL.path) {
                    self.logInfo("Found settings file in sandbox Application Support")
                    return sandboxURL
                }
            }

            self.logWarn("Settings file not found in any expected location")
            return nil
        #else
            let standaloneURL = Constants.standaloneSettingsURL
            self.logInfo("Checking standalone path: \(standaloneURL.path)")
            if FileManager.default.fileExists(atPath: standaloneURL.path) {
                self.logInfo("Found settings file in standalone location")
                return standaloneURL
            }
            self.logWarn("Settings file not found at standalone path")
            return nil
        #endif
        }

        private func migrateIndexFilters(config: Configuration) async {
            guard let filters = config.filtersState else {
                self.logWarn("No state for filters")
                return
            }

            let result = self.mapper.indexFilters(filters: filters)

            guard result.haveFilters else {
                self.logWarn("No index filters")
                return
            }

            await self.filtersSupervisor.setFilters(result.enabledIds, enabled: true)
            await self.filtersSupervisor.setFilters(result.disabledIds, enabled: false)
        }

        private func migrateCustomFilters(config: Configuration) async {
            guard let customFilters = config.customFilters else {
                self.logWarn("No custom filters")
                return
            }

            for filter in customFilters {
                guard let downloadUrl = filter.customUrl,
                      let title = filter.name else {
                    self.logWarn("Can't migrate custom filter: \(filter.filterId?.description ?? "unknown")")
                    continue
                }
                let result = await self.filtersSupervisor.installCustomFilter(
                    CustomFilterDTO(
                        downloadUrl: downloadUrl,
                        lastDownloadTime: filter.lastCheckTime ?? 0,
                        isEnabled: filter.enabled ?? true,
                        isTrusted: filter.trusted ?? false,
                        rules: filter.rules ?? [],
                        customTitle: title,
                        customDescription: filter.description
                    )
                )
                if result == -1 {
                    self.logWarn("Can't migrate custom filter: \(filter.filterId?.description ?? "unknown")")
                }
            }
        }

        private func createRules(basics: [String], isEnabled: Bool, creator: (String) -> String) -> [FilterRule] {
            basics.map {
                FilterRule(
                    ruleText: creator($0),
                    isEnabled: isEnabled
                )
            }
        }

        private func migrateUserRules(config: Configuration) async {
            let (enabled, rules) = self.mapper.userRules(config: config.userRules)

            await self.filtersSupervisor.saveUserRules(rules)

            let userRulesId = self.filtersSupervisor.filtersSpecialIds.userRulesId
            await self.filtersSupervisor.setFilters([userRulesId], enabled: enabled)
        }

        private func disableGroupSpecificFiltersIfNeedIt(config: Configuration) async {
            let enabledFilters = await self.filtersSupervisor.getEnabledFilters()
            guard let groupsState = config.groupsState else { return }

            let langSpecificGroupId = FiltersDefinedGroup.languageSpecific.id
            var disabledGroups: Set<Int> = Set(groupsState.compactMap {
                groupId, isEnabled in
                isEnabled ? nil : groupId
            })

            // We have a separate setting for the language-specific group.
            if disabledGroups.contains(langSpecificGroupId) {
                disabledGroups.remove(langSpecificGroupId)
                self.appSettings.languageSpecific = false
            } else {
                self.appSettings.languageSpecific = true
            }

            guard !disabledGroups.isEmpty else {
                self.logDebug("No disabled groups to disable group specific filters")
                return
            }

            let filtersForDisable = enabledFilters.compactMap {
                disabledGroups.contains($0.groupId) ? $0.filterId : nil
            }

            await self.filtersSupervisor.setFilters(filtersForDisable, enabled: false)
        }

        private func migrateFilters(config: Configuration) async {
            await self.filtersSupervisor.removeFilters()
            // Step 1: Migrate filters
            await self.migrateIndexFilters(config: config)
            await self.migrateCustomFilters(config: config)
            await self.migrateUserRules(config: config)

            // Step 2: Disable group specific filters if need it
            await self.disableGroupSpecificFiltersIfNeedIt(config: config)
        }

        private func migrateSettings(config: Configuration) async {
            self.sharedSettings.protectionEnabled = !(config.adguardDisabled ?? false)
            self.sharedSettings.advancedRules = true

            self.sharedSettings.launchOnStartup = config.launchAtLogin ?? false

            if let showTrayIcon = config.showTrayIcon {
                self.appSettings.setShowInMenuBar(showTrayIcon)
            }

            if let allowAcceptableAds = config.allowAcceptableAds {
                await self.filtersSupervisor.setFilters(
                    [AdGuardAdditionalFilterId.unblockSearchAdsFilterId],
                    enabled: allowAcceptableAds
                )
            }

            if let applicationId = config.clientId {
                ProductInfo.overrideApplicationId(applicationId)
            } else {
                self.logError("No client ID found in AgForSafari settings")
            }
        }
    }
}

extension Legacy.MigrationServiceImpl: LegacyMigrationService {
    // `@concurrent` so the blocking FLM transaction and config file reads stay off the caller's actor.
    /// Try migrate from legacy app.
    /// - Returns: True on success.
    /// - Throws: ``LegacyMigrationServiceError``
    @concurrent
    func tryMigrate() async throws -> Bool {
        #if MAS
        let deployType = "MAS"
        #else
        let deployType = "STANDALONE"
        #endif

        self.logInfo("Trying migrate legacy app for \(deployType) deployment")

        guard !self.appMetadata.didAttemptLegacyMigration else {
            let isMigrationPerformed = self.appMetadata.wasMigratedFromLegacyApp
            self.logInfo("Legacy migration already \(isMigrationPerformed ? "performed" : "attempted"). Skipping migration process")
            return false
        }

        guard let fileUrl = self.getSettingsFile() else {
            self.logError("Location for AgForSafari settings is unavailable or file does not exist")
            self.appMetadata.didAttemptLegacyMigration = true
            return false
        }

        self.logInfo("Reading AgForSafari config file from \(fileUrl.path)")
        defer {
            self.appMetadata.wasMigratedFromLegacyApp = true
            self.appMetadata.didAttemptLegacyMigration = true
        }

        guard self.filtersSupervisor.beginTransaction() else {
            self.logError("Begin FiltersSupervisor transaction failed")
            throw LegacyMigrationServiceError.cantWorkWithDb
        }

        do {
            let data = try Data(contentsOf: fileUrl)
            let config = try JSONDecoder().decode(Legacy.Configuration.self, from: data)
            self.logInfo("Migration from legacy version \(config.appVersion ?? "unknown")")
            await self.migrateFilters(config: config)
            await self.migrateSettings(config: config)
        } catch {
            self.logError("Failed to read AgForSafari config file: \(error)")
            if !self.filtersSupervisor.rollbackTransaction() {
                self.logError("Rollback FiltersSupervisor transaction failed")
            }
            throw error
        }

        if !self.filtersSupervisor.commitTransaction() {
            self.logError("Commit FiltersSupervisor transaction failed")
        }

        self.logInfo("Migration completed successfully")
        return true
    }
}
