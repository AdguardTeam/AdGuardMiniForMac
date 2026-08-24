// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SettingsImportFile.swift
//  AdGuard Mini
//

// swiftlint:disable cyclomatic_complexity

import Cocoa
import AML

private enum Constants {
    static let legacyCustomGroupId = 0

    static let legacyGroupsKey = "enabledLegacyGroups"
}

extension SettingsImportFile {
    /// Objective C compatible SettingsImportFile errors
    enum Error: ConvertableError {
        case
        createExportFolder(Swift.Error),
        uncompress,
        emptyArchive,
        convertToActual(ExchangeSettingsModelManifest),
        invalidArchive
    }
}

// MARK: SettingsImportFile Implementation

/// Service for importing of the app settings from FILE.
final class SettingsImportFile: SettingsImportBase {
    private let mapper: LegacyMapper

    init(api: SettingsImportApiService, userSettingsService: UserSettingsService, mapper: LegacyMapper) {
        self.mapper = mapper
        super.init(userSettingsService: userSettingsService)
        self.apiService = api
    }

    /// Prefetch and analyze the data to be imported.
    ///
    /// It is necessary in order to find out from the user whether user gives consent to import annoyance filters. Necessary for EULA and Privacy policy.
    /// - Parameter url: Path to the archive with data to import.
    /// - Returns: Array of containers with data to import.
    func prefetchImport(_ url: URL) async throws -> [ExchangeSettingsContainer] {
        try await Task.detached {
            if url.pathExtension == "json" {
                return try await self.prefetchLegacy(url)
            }
            return try await self.prefetchActual(url)
        }.value
    }

    // swiftlint:disable:next function_body_length
    func importItems(
        _ items: [ExchangeSettingsContainer],
        mode: ImportMode,
        annoyanceFiltersIds: [Int],
        progress parentProgress: Progress? = nil
    ) async throws {
        let progress = Progress(totalUnitCount: 100)
        progress.localizedDescription = "Importing AdGuard Mini Settings"
        progress.kind = ProgressKind("AdGuard Mini settings importing from file")
        parentProgress?.addChild(progress, withPendingUnitCount: 1)
        let result = await Task.detached {
            self.context = Context()

            var buildFolder: URL
            do {
                buildFolder = try FileManager.createBuildFolder()
            } catch {
                throw Error.createExportFolder(error)
            }

            // UndoManager is main-actor-isolated in the modern SDK; open the
            // Group on the main actor (closed by `stopImport`, also on main).
            await MainActor.run {
                progress.undoManager.beginUndoGrouping()
            }

            defer {
                // Delete build folder
                try? FileManager.default.removeItem(at: buildFolder)
                LogInfo("Temp folder removed: \(buildFolder.path)")
            }

            if progress.isCancelled { return }

            // MAIN PROCESS
            LogInfo("AdGuard Mini settings import started")

            guard !items.isEmpty else {
                throw Error.emptyArchive.log()
            }

            if progress.isCancelled { return }

            // Preparation before changing the stored app settings
            try self.prepareStorages(progress: progress)

            try await self.clearAllSettings(progress: progress)

            if progress.isCancelled {
                return
            }

            var preferences: ExchangeSettingsContainer?
            var legacyGroups: ExchangeSettingsContainer?

            var filtersForConsent: [Int] = []
            for item in items {
                if progress.isCancelled {
                    return
                }
                LogInfo("Processing \"\(item)\" started")

                if item.manifest.settingsType == .preferences {
                    preferences = item
                    continue
                }

                if item.manifest.settingsType == .legacyGroups {
                    legacyGroups = item
                    continue
                }

                if let filterId = item.filterId, annoyanceFiltersIds.contains(filterId) {
                    if mode == .withoutAnnoyance {
                        LogDebug("Skip annoyance filter due to .withoutAnnoyance import Mode")
                        continue
                    }
                    filtersForConsent.append(filterId)
                }

                try await self.importContainer(item, progress: progress)

                LogInfo("Processing \"\(item)\" finished")
            }

            if mode == .full, !filtersForConsent.isEmpty {
                filtersForConsent.append(contentsOf: self.userSettingsService.userConsent)
                self.userSettingsService.userConsent = filtersForConsent
            }

            if progress.isCancelled { return }

            if let container = preferences {
                try await self.importContainer(container, progress: progress)

                if progress.isCancelled { return }
            }

            if let container = legacyGroups {
                try await self.importContainer(container, progress: progress)

                if progress.isCancelled { return }
            }

            guard self.context.settingsModified else {
                throw Error.invalidArchive.log()
            }

            // Commit changes in the app storage and clear cached data
            try self.finalizeStorages(progress: progress)
        }.result

        let error: Swift.Error? = if case let .failure(error) = result {
            error
        } else {
            nil
        }

        try self.stopImport(progress: progress, error: error)
    }

    private func prefetchActual(_ url: URL) async throws -> [ExchangeSettingsContainer] {
        var containers: [ExchangeSettingsContainer] = []

        self.context = Context()

        var buildFolder: URL
        do {
            buildFolder = try FileManager.createBuildFolder()
        } catch {
            throw Error.createExportFolder(error)
        }

        defer {
            // Delete build folder
            try? FileManager.default.removeItem(at: buildFolder)
            LogInfo("Temp folder removed: \(buildFolder.path)")
        }

        // MAIN PROCESS
        let name = BuildConfig.AG_APP_DISPLAYED_NAME
        LogInfo("\(name) settings prefetch started")
        LogInfo("\(name) settings prefetch from: \(url.path)")
        LogInfo("\(name) settings prefetch build folder: \(buildFolder.path)")

        _ = try SystemUtil.uncompress(url, targetFolderUrl: buildFolder)

        let files = {
            let enumerator = FileManager.default.enumerator(
                at: buildFolder,
                includingPropertiesForKeys: [.nameKey, .isDirectoryKey],
                options: .skipsHiddenFiles
            )

            var result: [URL] = []
            while let url = enumerator?.nextObject() as? URL {
                if url.hasDirectoryPath { continue }
                result.append(url)
            }
            return result
        }()

        guard !files.isEmpty else {
            throw Error.emptyArchive.log()
        }

        for item in files {
            LogInfo("Prefetching \"\(item)\" started")

            self.context.currentProcessedFileUrl = item
            defer {
                self.context.currentProcessedFileUrl = nil
            }

            switch item.pathExtension {
            case ExchangeSettings.jsonExtension:
                let jsonData = try Data(contentsOf: item)
                guard let jsonDict = try JSONSerialization.jsonObject(
                    with: jsonData,
                    options: [.mutableContainers, .mutableLeaves]
                ) as? [String: Any],
                      let manifestDict = jsonDict["manifest"] as? [String: Any],
                      let manifest = ExchangeSettingsModelManifest(json: manifestDict),
                      let payload = jsonDict["payload"] as? [String: Any]
                else {
                    continue
                }

                let container = ExchangeSettingsContainer(url: item, manifest: manifest, payload: payload)
                containers.append(container)
            default:
                continue
            }

            LogInfo("Prefetching \"\(item)\" finished")
        }
        return containers
    }

    // swiftlint:disable:next function_body_length
    private func prefetchLegacy(_ url: URL) async throws -> [ExchangeSettingsContainer] {
        var containers: [ExchangeSettingsContainer] = []
        self.context = Context()

        let name = "AdGuard for Safari"
        LogInfo("\(name) legacy settings prefetch started")
        LogInfo("\(name) legacy settings prefetch from: \(url.path)")

        self.context.currentProcessedFileUrl = url
        defer {
            self.context.currentProcessedFileUrl = nil
        }

        let data = try Data(contentsOf: url)
        let settings = try JSONDecoder().decode(Legacy.Settings.self, from: data)

        var preferencesPayload: [String: Any] = [:]
        var allowAcceptableAds = false

        if let preferences = settings.generalSettings {
            if let showTrayIcon = preferences.showTrayIcon {
                preferencesPayload[SettingsKey.showInMenuBar.rawValue] = showTrayIcon
            }

            if let launchAtLogin = preferences.launchAtLogin {
                preferencesPayload[SharedSettingsKey.launchOnStartup.rawValue] = launchAtLogin
            }

            if let unblockSearchAdsFilter = preferences.allowAcceptableAds,
               unblockSearchAdsFilter {
                allowAcceptableAds = true
                containers.append(
                    .init(
                        url: url,
                        manifest: .legacy(settingsType: .blockingFilters),
                        payload: [
                            ExchangeSettingsModel.BlockingFilter.dtoKey: FilterDTO(
                                meta: .init(
                                    filterId: AdGuardAdditionalFilterId.unblockSearchAdsFilterId,
                                    isEnabled: true
                                ),
                                rules: nil
                            )
                        ]
                    )
                )
            }
        }

        if let filters = settings.filters {
            let langSpecificGroupId = FiltersDefinedGroup.languageSpecific.id
            var enabledGroups: Set<Int> = Set(filters.enabledGroups ?? [])
            let languageSpecificEnabled = enabledGroups.contains(langSpecificGroupId)
            enabledGroups.insert(langSpecificGroupId)

            containers.append(
                .init(
                    url: url,
                    manifest: .legacy(settingsType: .legacyGroups),
                    payload: [
                        Constants.legacyGroupsKey: enabledGroups
                    ]
                )
            )

            preferencesPayload[SettingsKey.languageSpecific.rawValue] = languageSpecificEnabled

            var userRulesConfig = Legacy.UserRulesConfig()
            if let filterIds = filters.enabledFilters {
                for filterId in filterIds {
                    if allowAcceptableAds && filterId == AdGuardAdditionalFilterId.unblockSearchAdsFilterId {
                        continue
                    }

                    containers.append(
                        .init(
                            url: url,
                            manifest: .legacy(settingsType: .blockingFilters),
                            payload: [
                                ExchangeSettingsModel.BlockingFilter.dtoKey: FilterDTO(
                                    meta: .init(
                                        filterId: filterId,
                                        isEnabled: true
                                    ),
                                    rules: nil
                                )
                            ]
                        )
                    )
                }
            }

            if let filters = filters.customFilters {
                let isCustomFiltersEnabled = enabledGroups.contains(Constants.legacyCustomGroupId)
                for filter in filters {
                    containers.append(
                        .init(
                            url: url,
                            manifest: .legacy(settingsType: .blockingFilters),
                            payload: [
                                ExchangeSettingsModel.BlockingFilter.dtoKey: FilterDTO(
                                    meta: .init(
                                        filterId: filter.filterID,
                                        name: filter.title,
                                        url: filter.customURL,
                                        isCustom: true,
                                        isTrusted: filter.trusted,
                                        isEnabled: filter.enabled && isCustomFiltersEnabled
                                    ),
                                    rules: nil
                                )
                            ]
                        )
                    )
                }
            }

            if let userRules = filters.userFilter {
                userRulesConfig.enabled = userRules.enabled
                userRulesConfig.userFilterRules = userRules.rules?.components(separatedBy: .newlines)
            }
            if let allowList = filters.allowlist {
                userRulesConfig.allowlistEnabled = allowList.enabled
                userRulesConfig.defaultAllowlistMode = !(allowList.inverted ?? true)
                userRulesConfig.whiteListDomains = allowList.domains
                userRulesConfig.blockListDomains = allowList.invertedDomains
            }

            let userRules = self.mapper.userRules(config: userRulesConfig)

            let userRulesContainer = ExchangeSettingsContainer(
                url: url,
                manifest: .legacy(settingsType: .blockingFilters),
                payload: [
                    ExchangeSettingsModel.BlockingFilter.dtoKey: FilterDTO(
                        meta: .init(
                            filterId: self.apiService.userRulesId,
                            isEnabled: userRules.enabled
                        ),
                        rules: userRules.rules.map { FilterRuleDTO(ruleText: $0.ruleText, isEnabled: $0.isEnabled) }
                    )
                ]
            )
            containers.append(userRulesContainer)

            if !preferencesPayload.isEmpty {
                containers.append(
                    ExchangeSettingsContainer(
                        url: url,
                        manifest: .legacy(settingsType: .preferences),
                        payload: preferencesPayload
                    )
                )
            }
        }

        LogInfo("Prefetching legacy settings finished")
        return containers
    }
}

// MARK: Private Methods

private extension SettingsImportFile {
    private func checkContext(url: URL, manifest: ExchangeSettingsModelManifest) throws -> Bool {
        var imported = false
        if manifest.settingsType == .preferences {
            imported = self.context.preferencesImported
        }
        if imported {
            LogWarn("\(manifest.settingsType) already imported, ignored file: \(url.path)")
            return false
        }
        return true
    }

    private func importContainer(_ container: ExchangeSettingsContainer, progress: Progress) async throws {
        LogInfo("Importing \(container.manifest.settingsType) started")

        switch container.manifest.settingsType {
        case .preferences:
            try self.importPreferences(container: container, progress: progress)
        case .blockingFilters:
            try await self.importBlockingFilter(container: container, progress: progress)
            return
        case .legacyGroups:
            let enabledLegacyGroups = container.payload[Constants.legacyGroupsKey] as? Set<Int> ?? []
            await self.apiService.disableGroupSpecificFilters(notIn: enabledLegacyGroups)
            return
        default:
            return
        }
        LogInfo("Importing \(container.manifest.settingsType) finished")

        self.context.settingsModified = true
    }

    private func importPreferences(container: ExchangeSettingsContainer, progress: Progress) throws {
        // Transform input dict into entity dict
        guard let dict = try ExchangeSettingsModel.convertPreferencesEntity(
            container.payload,
            from: container.manifest.version
        )
        else {
            throw Error.invalidArchive
        }
        let model = try ExchangeSettingsModel.Preferences(plist: dict, progress: progress)
        let entity = try model.entity(progress: progress)

        try self.importPreferences(entity: entity, progress: progress)
    }

    private func importBlockingFilter(container: ExchangeSettingsContainer, progress: Progress) async throws {
        let model = try ExchangeSettingsModel.BlockingFilter(dict: container.payload, progress: progress)
        let entity = try model.entity(progress: progress)

        try await self.importBlockingFilter(entity: entity, progress: progress)
    }
}

// MARK: SettingsImportError Implementation

extension SettingsImportFile.Error {
    static var errorDomain: String = "SettingsImportFileErrorDomain"

    /// A localized message describing what error occurred.
    var errorDescription: String? {
        switch self {
        case .uncompress:
            "import_settings_panel_error_message_uncompress"
        case .emptyArchive:
            "import_settings_panel_error_message_empty"
        case .convertToActual:
            "import_settings_panel_error_message_version_convert"
        case .invalidArchive:
            "import_settings_panel_error_message_invalid_archive"
        default:
            "exchange_settings_unknown_error_message"
        }
    }

    /// Debug description of an error, which is displayed in debug console
    var errorDebugDescription: String? {
        switch self {
        case .createExportFolder(let error):
            "Can't create temp folder for importing: \(error)"
        case .uncompress:
            "Can't uncompress archive into temp settings folder"
        case .emptyArchive:
            "Settings archive is empty"
        case .convertToActual(let manifest):
            "Can't convert setting into actual version: \(manifest)"
        case .invalidArchive:
            "Settings archive must contain at least one valid file"
        }
    }
}

private extension ExchangeSettingsModelManifest {
    static func legacy(settingsType: ExchangeSettingsItemType) -> Self {
        Self(
            version: "legacy",
            appVersion: "1.x",
            settingsType: settingsType
        )
    }
}

// swiftlint:enable cyclomatic_complexity
