// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FiltersSupervisor.swift
//  AdguardMini
//

import Foundation

import AML
import FLM

// MARK: - Constants

private enum Constants {
    static let baseFilterId = 2
}

// MARK: - FiltersSupervisorError

enum FiltersSupervisorError: Error {
    case cantInstallFilter
    case cantRemoveCustomFilter
}

// MARK: - FLM API

enum FlmApi {
    // MARK: - ReadOnly

    protocol ReadOnly {
        func getAllFilters() async -> [FilterInfo]
        func getStoredFilterMetadataWithRulesCount() async -> [(meta: FilterInfo, count: Int)]
        func getEnabledFilters() async -> [FilterInfo]
        func getEnabledFilterIds() async -> [Int]
        func getActiveRulesInfo() async -> [ActiveFilterInfo]
        func getGroups() async -> [FilterGroup]
        func getTags() async -> [FilterTag]
        func getRules(for filterId: Int) async -> [FilterRule]
    }

    protocol Interact {
        func setFilters(_ filterIds: [Int], enabled: Bool) async
        func updateCustomFilterMetadata(_ filterId: Int, title: String, trusted: Bool) async
        func removeCustomFilters(_ filterIds: [Int]) async throws
        func installCustomFilter(
            from url: String,
            isTrusted: Bool,
            title: String?,
            description: String?
        ) async throws
        func installCustomFilter(_ filter: CustomFilterDTO) async -> Int
        func fetchFilterMetadata(from url: String) async -> FilterMetadata?

        func switchLanguageSpecific(_ state: Bool) async
    }

    // MARK: - UserRules

    protocol UserRules {
        func isUserRulesEnabled() async -> Bool
        func getUserRules() async -> [FilterRule]
        func saveUserRules(_ rules: [FilterRule]) async
        func saveUserRules(_ rules: String) async
        func addUserRule(_ newRuleText: String) async -> Bool
        func removeUserRules(_ option: UserRulesRemoveOption) async -> Bool
        func removeUserRules() async

        // Custom

        func getEnabledUserRules() async -> [String]
        func getUserRulesAsString() async -> String
    }

    // MARK: - Transactions

    protocol Transactions {
        func beginTransaction() -> Bool
        func commitTransaction() -> Bool
        func rollbackTransaction() -> Bool
    }

    // MARK: - Update

    protocol Update {
        func filtersForceUpdate()
    }

    // MARK: - Common protocol

    typealias All = ReadOnly & Interact & UserRules & Transactions & Update
}

// MARK: - FiltersSupervisor

protocol FiltersSupervisor: RestartableService, FlmApi.All {
    var filtersSpecialIds: FLMConstants { get }
    var languageSpecific: Bool { get }

    func getFiltersIndex() async -> FiltersIndex
    func removeFilters() async

    func reset() async
}

// MARK: - FiltersSupervisorImpl

final class FiltersSupervisorImpl: RestartableServiceBase {
    private let safariFiltersStorage: SafariFiltersStorage
    private let safariFiltersUpdater: SafariFiltersUpdater
    private let mailFiltersUpdater: MailFiltersUpdater
    private let filtersUpdateService: FiltersUpdateService
    private let filtersManager: FLMProtocol
    private let userSettingsService: UserSettingsService
    private let eventBus: EventBus

    /// Tracks whether any FLM update is currently running (either periodic or
    /// user-initiated). Used to skip redundant force update requests when an
    /// update is already in progress — the callback will arrive from the
    /// running update.
    private var isFiltersUpdateInProgress = false

    var filtersSpecialIds: FLMConstants

    init(
        safariFiltersStorage: SafariFiltersStorage,
        safariFiltersUpdater: SafariFiltersUpdater,
        filtersUpdateService: FiltersUpdateService,
        filtersManager: FLMProtocol,
        userSettingsService: UserSettingsService,
        eventBus: EventBus,
        mailFiltersUpdater: MailFiltersUpdater
    ) {
        self.safariFiltersStorage = safariFiltersStorage
        self.safariFiltersUpdater = safariFiltersUpdater
        self.filtersUpdateService = filtersUpdateService
        self.filtersManager = filtersManager
        self.userSettingsService = userSettingsService
        self.eventBus = eventBus
        self.mailFiltersUpdater = mailFiltersUpdater

        self.filtersSpecialIds = filtersManager.constants

        super.init()

        self.filtersManager.delegate = self

        self.setupInitialFilters()
    }

    override func start() {
        super.start()

        Task {
            if await !self.safariFiltersStorage.isAllRulesExists {
                self.safariFiltersUpdater.updateSafariFilters()
            }
            self.safariFiltersUpdater.start()
            self.mailFiltersUpdater.start()
            self.filtersUpdateService.start()
            self.filtersUpdateService.rescheduleTimer()
        }
    }

    override func stop() {
        super.stop()

        self.safariFiltersUpdater.stop()
        self.mailFiltersUpdater.stop()
        self.filtersUpdateService.stop()
    }

    private func setupInitialFilters() {
        let finfos = self.installIndexFilters()

        guard !finfos.isEmpty
        else { return }

        var filterIdsToEnable: [Int] = [Constants.baseFilterId]

        let langs = Locales.filtersPreferredLangs

        for finfo in finfos {
            let langsInFilter = finfo.languages

            for lang in langs
            where !langsInFilter.first(where: { lang.contains($0) }).isNil {
                filterIdsToEnable.append(finfo.filterId)
                break
            }
        }

        self.filtersManager.setFilters(filterIdsToEnable, enabled: true)
    }

    /// Installs index filters that are not yet installed.
    /// New filters appear in the index after a metadata pull but are not
    /// installed by default, which would hide them from the UI.
    /// - Returns: Full filter list on first install, empty array otherwise.
    @discardableResult
    private func installIndexFilters() -> [FilterInfo] {
        let finfos = self.filtersManager.getAllFilters()
        let isFirstInstall = finfos.first { $0.isInstalled }.isNil

        // Custom filters have their own installation lifecycle and are skipped.
        let filterIdsToInstall = finfos
            .filter { !$0.isCustom && !$0.isInstalled }
            .map(\.filterId)

        if !filterIdsToInstall.isEmpty {
            LogInfo("\(LogTag.flm) Installing index filters: \(filterIdsToInstall)")
            self.filtersManager.setIndexFilters(filterIdsToInstall, installed: true)
        }

        return isFirstInstall ? finfos : []
    }

    private func updateContentBlockersOnSuccess(
        _ isSuccess: Bool = true,
        affectsMail: Bool = false
    ) {
        if isSuccess {
            self.safariFiltersUpdater.updateSafariFilters()
        }
        // `affectsMail` defaults to `false`. Only user-rules callers pass
        // `affectsMail: true`. Filter toggles use the filter-25 decision.
        if isSuccess, affectsMail {
            self.mailFiltersUpdater.updateMailFilters()
        }
    }

    private func asyncly<T>(_ completion: @escaping () throws -> T) async throws -> T {
        try await Task.detached {
            try completion()
        }
        .value
    }

    private func asyncly<T>(_ completion: @escaping () -> T) async -> T {
        await Task.detached {
            completion()
        }
        .value
    }

    // MARK: - FLM Call Logging

    private func flmLog(_ msg: String, debug: Bool) {
        if debug { LogDebug(msg) } else { LogInfo(msg) }
    }

    private func flmCall<T>(
        _ label: String = #function,
        debug: Bool = false,
        _ completion: @escaping () throws -> T
    ) async throws -> T {
        let callId = UUID.shortId
        let start = Date()
        self.flmLog("\(LogTag.flm) \(label) start (id: \(callId))", debug: debug)
        do {
            let result = try await self.asyncly(completion)
            self.flmLog("\(LogTag.flm) \(label) end (id: \(callId)), \(start.elapsedMs())", debug: debug)
            return result
        } catch {
            self.flmLog("\(LogTag.flm) \(label) end (error: \(error), id: \(callId)), \(start.elapsedMs())", debug: debug)
            throw error
        }
    }

    private func flmCall<T>(
        _ label: String = #function,
        debug: Bool = false,
        _ completion: @escaping () -> T
    ) async -> T {
        let callId = UUID.shortId
        let start = Date()
        self.flmLog("\(LogTag.flm) \(label) start (id: \(callId))", debug: debug)
        let result = await self.asyncly(completion)
        self.flmLog("\(LogTag.flm) \(label) end (id: \(callId)), \(start.elapsedMs())", debug: debug)
        return result
    }
}

extension FiltersSupervisorImpl: FiltersSupervisor {
    var languageSpecific: Bool {
        self.userSettingsService.languageSpecific
    }

    func getFiltersIndex() async -> FiltersIndex {
        await self.flmCall {
            let tags = self.filtersManager.getTags()
            let groups = self.filtersManager.getGroups()
            let filters = self.filtersManager.getAllFilters()

            let customGroupId = self.filtersSpecialIds.customGroupId

            let defaultGroups = groups.filter {
                $0.id != customGroupId
            }
            return FiltersIndexImpl(
                filters: filters,
                tags: tags,
                groups: defaultGroups,
                customGroupId: customGroupId
            )
        }
    }

    func removeFilters() async {
        await self.flmCall {
            let activeFilters = self.filtersManager.getActiveRulesInfo().map(\.filterId)
            self.filtersManager.setFilters(activeFilters, enabled: false)
            self.filtersManager.removeUserRules()
            self.filtersManager.removeCustomFilters()
            self.filtersManager.uninstallIndexFilters()
            _ = self.installIndexFilters()
        }
    }
}

extension FiltersSupervisorImpl: FLMFatalErrorDelegate {
    func onFatalError(_ flm: FLMProtocol) {
        LogError("Fatal error occurred in FLM. See logs above")
        self.eventBus.post(event: .flmFatalError, userInfo: nil)
    }
}

// MARK: - Interact API

extension FiltersSupervisorImpl: FlmApi.Interact {
    func setFilters(_ filterIds: [Int], enabled: Bool) async {
        await self.flmCall("setFilters(\(filterIds), enabled: \(enabled))") {
            self.filtersManager.setFilters(filterIds, enabled: enabled)
            if enabled {
                Task {
                    self.filtersManager.updateFiltersByIds(
                        ids: filterIds,
                        ignoreFiltersExpiration: false,
                        ignoreFiltersStatus: false
                    )
                }
            }
            self.updateContentBlockersOnSuccess(
                true,
                affectsMail: MailRegenerationDecision.includesMailFilter(filterIds)
            )
        }
    }

    func updateCustomFilterMetadata(_ filterId: Int, title: String, trusted: Bool) async {
        await self.flmCall("updateCustomFilterMetadata(\(filterId))") {
            self.filtersManager.updateCustomFilterMetadata(filterId, title: title, trusted: trusted)
            self.updateContentBlockersOnSuccess()
        }
    }

    func removeCustomFilters(_ filterIds: [Int]) async throws {
        try await self.flmCall("removeCustomFilters(\(filterIds))") {
            if !self.filtersManager.removeCustomFilters(filterIds) {
                throw FiltersSupervisorError.cantRemoveCustomFilter
            }
            self.updateContentBlockersOnSuccess()
        }
    }

    func installCustomFilter(
        from url: String,
        isTrusted: Bool,
        title: String?,
        description: String?
    ) async throws {
        let filterId = await self.flmCall {
            self.filtersManager.installCustomFilter(
                from: url,
                isTrusted: isTrusted,
                title: title,
                description: description
            )
        }
        if filterId == FLM.constants.invalidFilterId {
            throw FiltersSupervisorError.cantInstallFilter
        }
        self.updateContentBlockersOnSuccess()
    }

    func installCustomFilter(_ filter: CustomFilterDTO) async -> Int {
        await self.flmCall {
            let result = self.filtersManager.installCustomFilterFromString(
                subscriptionUrl: filter.downloadUrl,
                lastDownloadTime: Date(timeIntervalSince1970: Double(filter.lastDownloadTime)),
                isEnabled: filter.isEnabled,
                isTrusted: filter.isTrusted,
                filterBody: filter.filterBody,
                title: filter.customTitle,
                description: filter.customDescription
            )
            self.updateContentBlockersOnSuccess(result > 0)
            return result
        }
    }

    func fetchFilterMetadata(from url: String) async -> FilterMetadata? {
        await self.flmCall {
            self.filtersManager.fetchFilterMetadata(from: url)
        }
    }

    func switchLanguageSpecific(_ state: Bool) async {
        await self.flmCall("switchLanguageSpecific(\(state))") {
            self.userSettingsService.languageSpecific = state
            self.updateContentBlockersOnSuccess()
        }
    }
}

// MARK: ReadOnly API

extension FiltersSupervisorImpl: FlmApi.ReadOnly {
    func getAllFilters() async -> [FilterInfo] {
        await self.flmCall(debug: true) {
            self.filtersManager.getAllFilters()
        }
    }

    func getStoredFilterMetadataWithRulesCount() async -> [(meta: FilterInfo, count: Int)] {
        await self.flmCall {
            self.filtersManager.getStoredFilterMetadataWithRulesCount()
        }
    }

    func getEnabledFilters() async -> [FilterInfo] {
        await self.flmCall(debug: true) {
            self.filtersManager.getEnabledFilters()
        }
    }

    func getEnabledFilterIds() async -> [Int] {
        await self.flmCall(debug: true) {
            let filters = self.filtersManager.getEnabledFilters()
            return filters.map(\.filterId)
        }
    }

    func getActiveRulesInfo() async -> [ActiveFilterInfo] {
        await self.flmCall {
            self.filtersManager.getActiveRulesInfo()
        }
    }

    func getGroups() async -> [FilterGroup] {
        await self.flmCall(debug: true) {
            self.filtersManager.getGroups()
        }
    }

    func getTags() async -> [FilterTag] {
        await self.flmCall(debug: true) {
            self.filtersManager.getTags()
        }
    }

    func getRules(for filterId: Int) async -> [FilterRule] {
        await self.flmCall("getRules(filterId: \(filterId))") {
            self.filtersManager.getRules(for: filterId)
        }
    }
}

// MARK: Transactions Api

extension FiltersSupervisorImpl: FlmApi.Transactions {
    func beginTransaction() -> Bool {
        self.filtersManager.beginTransaction()
    }

    func commitTransaction() -> Bool {
        self.filtersManager.commitTransaction()
    }

    func rollbackTransaction() -> Bool {
        self.filtersManager.rollbackTransaction()
    }
}

// MARK: - User rules API

extension FiltersSupervisorImpl: FlmApi.UserRules {
    func isUserRulesEnabled() async -> Bool {
        await self.flmCall(debug: true) {
            self.filtersManager.isUserRulesEnabled()
        }
    }

    func getUserRules() async -> [FilterRule] {
        await self.flmCall(debug: true) {
            self.filtersManager.getUserRules()
        }
    }

    func getUserRulesAsString() async -> String {
        await self.flmCall(debug: true) {
            self.filtersManager.getRulesContent(for: self.filtersSpecialIds.userRulesId)?.rules ?? ""
        }
    }

    func getEnabledUserRules() async -> [String] {
        await self.getUserRules().compactMap { $0.isEnabled ? $0.ruleText : nil }
    }

    func saveUserRules(_ rules: [FilterRule]) async {
        await self.flmCall("saveUserRules(rules: [\(rules.count) items])") {
            self.filtersManager.saveUserRules(rules)
            self.updateContentBlockersOnSuccess(affectsMail: true)  // user rules affect mail
        }
    }

    func saveUserRules(_ rules: String) async {
        await self.flmCall("saveUserRules(string)") {
            self.filtersManager.saveUserRules(rules)
            self.updateContentBlockersOnSuccess(affectsMail: true)
        }
    }

    func addUserRule(_ newRuleText: String) async -> Bool {
        await self.flmCall {
            let result = self.filtersManager.addUserRule(newRuleText, toBeggining: true)
            self.updateContentBlockersOnSuccess(result, affectsMail: true)
            return result
        }
    }

    func removeUserRules(_ option: UserRulesRemoveOption) async -> Bool {
        await self.flmCall("removeUserRules(\(option))") {
            let result = self.filtersManager.removeUserRules(option)
            self.updateContentBlockersOnSuccess(result, affectsMail: true)
            return result
        }
    }

    func removeUserRules() async {
        await self.flmCall {
            self.filtersManager.removeUserRules()
            self.updateContentBlockersOnSuccess(affectsMail: true)
        }
    }
}

// MARK: - Update API

extension FiltersSupervisorImpl: FlmApi.Update {
    func filtersForceUpdate() {
        guard !self.isFiltersUpdateInProgress else {
            LogInfo("\(LogTag.flm) filtersForceUpdate skipped — update already in progress")
            return
        }
        LogInfo("\(LogTag.flm) filtersForceUpdate start")
        self.filtersManager.update(ignoringFiltersExpiration: true, pullMetadata: false)
        LogInfo("\(LogTag.flm) filtersForceUpdate dispatched")
    }
}

// MARK: - Reset API

extension FiltersSupervisorImpl {
    func reset() async {
        let isStartedNow = self.isStarted
        self.stop()

        do {
            let dbPath = self.filtersManager.dbPath.deletingLastPathComponent
            try FileManager.default.removeItem(atPath: dbPath)
        } catch {
            LogError("Can't remove db: \(error)")
        }
        self.safariFiltersStorage.resetStorage()
        if isStartedNow {
            self.start()
        }
    }
}

// MARK: - FiltersDelegate implementation
extension FiltersSupervisorImpl: FLMDelegate {}

// MARK: - FiltersUpdateDelegate implementation

extension FiltersSupervisorImpl: FLMUpdateDelegate {
    func willStartFiltersUpdate() {
        self.isFiltersUpdateInProgress = true
        self.eventBus.post(event: .filtersUpdateStarted, userInfo: nil)
    }

    func didUpdateFilters(_ result: Result<FiltersUpdateResult, Error>) {
        // The in-progress flag gates `filtersForceUpdate()`'s early-return guard.
        // Clear it on every exit so subsequent force-updates are not skipped.
        self.isFiltersUpdateInProgress = false

        switch result {
        case .success(let updated):
            self.userSettingsService.lastFiltersUpdateTime = Date()
            LogInfo("\(LogTag.flm) filtersUpdate end (updated: \(updated.updatedList.count))")
            if updated.hasAnyUpdates {
                // Every successful update triggers Safari regeneration.
                // Mail regenerates only when filter 25 was among the updated filter IDs.
                self.updateContentBlockersOnSuccess(true, affectsMail: false)
                if MailRegenerationDecision.includesMailFilter(updated.updatedList.map(\.filterId)) {
                    self.mailFiltersUpdater.updateMailFilters()
                }
                self.eventBus.post(event: .filtersRulesUpdated, userInfo: nil)
            }
            self.eventBus.post(event: .filterStatusResolved, userInfo: updated)
        case .failure(let error):
            LogInfo("\(LogTag.flm) filtersUpdate end (error: \(error))")
            self.eventBus.post(event: .filterStatusResolved, userInfo: nil)
        }
    }

    func didPullMetadata(_ error: Error?) {
        if let error {
            LogError("\(LogTag.flm) didPullMetadata error: \(error)")
            return
        }

        LogInfo("\(LogTag.flm) didPullMetadata success")
        Task {
            // Pulled metadata may contain filters that are new to the index.
            // Install them so their rules get downloaded and counted.
            await self.asyncly {
                _ = self.installIndexFilters()
            }
            let newIndex = await self.getFiltersIndex()
            self.eventBus.post(event: .filtersMetadataUpdated, userInfo: newIndex)
        }
    }
}

// MARK: - UpdatePeriodStorageProtocol implementation

extension FiltersSupervisorImpl: FLMUpdatePeriodDelegate {
    var filtersTimerCheckPeriod: Double? {
        DeveloperConfigUtils[.filtersTimerCheckPeriod] as? Double
    }

    var filtersDiffUpdatePeriod: Double? {
        DeveloperConfigUtils[.filtersDiffUpdatePeriod] as? Double
    }

    var filtersFullUpdatePeriod: Double? {
        DeveloperConfigUtils[.filtersFullUpdatePeriod] as? Double
    }
}

// MARK: - UUID + shortId

private extension UUID {
    /// Generates a new UUID and returns its first 8 characters, used as a short identifier in logs.
    static var shortId: String { String(UUID().uuidString.prefix(8)) }
}
