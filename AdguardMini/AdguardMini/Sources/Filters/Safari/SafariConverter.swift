// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariConverter.swift
//  AdguardMini
//

import Foundation
import SafariServices
import OrderedCollections

import AML
import ContentBlockerConverter
import FilterEngine
import AdGuardFLM
import FLM

// MARK: - Constants

private enum Constants {
    static let trustedRulesModifiers = ["$hls", "$removeheader", "$removeparam", "$replace"]
}

// MARK: - SafariConverter

protocol SafariConverter {
    func convertRulesAndSave(
        filters: [ActiveFilterInfo],
        advanced: Bool,
        progress: Progress
    ) -> AsyncStream<SafariConversionResult>
}

// MARK: - SafariConverterImpl

final class SafariConverterImpl {
    private let filtersConverter: FiltersConverter
    private let storage: SafariFiltersStorage
    private let webExtension: WebExtension

    private let userRulesId: Int
    private let specialGroupId: Int
    private weak var delegate: ConversionStateDelegate?

    init(
        filtersConverter: FiltersConverter,
        storage: SafariFiltersStorage,
        webExtension: WebExtension,
        userRulesId: Int,
        specialGroupId: Int,
        resultStateObserver: ConversionStateDelegate?
    ) {
        self.filtersConverter = filtersConverter
        self.storage = storage
        self.webExtension = webExtension
        self.delegate = resultStateObserver
        self.userRulesId = userRulesId
        self.specialGroupId = specialGroupId
    }

    private func checkRulesAndPrepareForGetRules(filters: [ActiveFilterInfo]) -> PreparedRules {
        var preparedFilters = PreparedRules(
            userRulesId: self.userRulesId,
            specialGroupId: self.specialGroupId
        )

        for filter in filters {
            if filter.filterId != self.userRulesId {
                var newRules: [String] = []
                for rule in filter.rules where filter.isTrusted || self.isTrustedRule(ruleText: rule) {
                    newRules.append(rule)
                }

                if !newRules.isEmpty {
                    preparedFilters.add(filterList: filter, newRules: newRules)
                }
            } else {
                preparedFilters.add(filterList: filter, newRules: filter.rules)
            }
        }

        return preparedFilters
    }

    private func convertAndSave(
        safariBlockerType: SafariBlockerType,
        rules: [String],
        isAdvancedBlocking: Bool,
        progress: Progress
    ) async -> Result<ConversionInfo, BlockerConversionError> {
        let conversionResult = self.filtersConverter
            .convertArray(
                rules: rules,
                isAdvancedBlocking: isAdvancedBlocking,
                progress: progress
            )

        guard let data = conversionResult.safariRulesJSON.data(using: .utf8) else {
            return .failure(.noData)
        }

        guard !progress.isCancelled else { return .failure(.cancelled) }

        if await self.storage.save(data: data, type: safariBlockerType) {
            return .success(conversionResult.conversionInfo)
        }

        return .failure(.cantSave)
    }

    /// Checks that the rule does not contain any tokens applicable to trusted filters, and returns true if not
    private func isTrustedRule(ruleText: String) -> Bool {
        if Constants.trustedRulesModifiers.contains(where: { ruleText.contains($0) }) {
            return false
        }

        if ruleText.contains("#%#") && !ruleText.contains("#%#//scriptlet") {
            return false
        }

        if ruleText.contains("#%#//scriptlet('trusted-") || ruleText.contains("#%#//scriptlet(\"trusted-") {
            return false
        }

        return true
    }

    private func convertAndSaveGroups(
        groups: [ContentBlockerType: [String]],
        progress: Progress
    ) -> AsyncStream<SafariConversionResult> {
        AsyncStream { continuation in
            Task.detached(priority: .utility) {
                await withTaskGroup(
                    of: SafariConversionResult.self
                ) { [delegate = self.delegate] taskGroup in
                    for (contentBlockerType, rules) in groups where !rules.isEmpty {
                        let safariBlockerType = SafariBlockerType(contentBlockerType)
                        taskGroup.addTask {
                            await delegate?.onStartConversion(blockerType: safariBlockerType)
                            let convStart = Date()
                            LogInfo("\(LogTag.safari) convertAndSave(\(safariBlockerType)) start")
                            let result = await self.convertAndSave(
                                safariBlockerType: safariBlockerType,
                                rules: rules,
                                isAdvancedBlocking: true,
                                progress: progress
                            )
                            LogInfo("\(LogTag.safari) convertAndSave(\(safariBlockerType)) end, \(convStart.elapsedMs())")
                            return .init(blockerType: safariBlockerType, conversionInfo: result)
                        }
                    }

                    for await result in taskGroup {
                        await delegate?.onEndConversion(result)
                        continuation.yield(result)
                    }
                }
                continuation.finish()
            }
        }
    }
}

// MARK: - SafariConverter implementation

extension SafariConverterImpl: SafariConverter {
    // The method orchestrates the full conversion pipeline: preparing rules,
    // Mapping filter groups, running affinity grouping, and building the
    // FilterEngine. The length and complexity reflect the sequential nature
    // Rather than any single complex sub-task, both suppressions are justified.
    // swiftlint:disable:next function_body_length cyclomatic_complexity
    func convertRulesAndSave(
        filters: [ActiveFilterInfo],
        advanced: Bool,
        progress: Progress
    ) -> AsyncStream<SafariConversionResult> {
        AsyncStream { continuation in
            Task.detached(priority: .utility) {
                defer {
                    continuation.finish()
                }

                let preparedFilters = self.checkRulesAndPrepareForGetRules(filters: filters)

                var rulesByType: [(ContentBlockerType, [String])] = []
                for (groupId, rules) in preparedFilters.data {
                    if let contentBlockerType = ContentBlockerType.from(groupId: groupId) {
                        rulesByType.append((contentBlockerType, rules))
                    }
                }

                if !preparedFilters.userRulesList.isEmpty {
                    rulesByType.append((.custom, preparedFilters.userRulesList))
                }

                if !preparedFilters.serviceGroups.isEmpty {
                    rulesByType.append((.other, preparedFilters.serviceGroups))
                }

                let grouped = AffinityRulesGrouper.group(rules: rulesByType)

                var advancedRules: OrderedSet<String> = []
                var sourceRulesCount = 0
                var sourceSafariCompatibleRulesCount = 0
                var safariRulesCount = 0
                var advancedRulesCount = 0
                var discardedSafariRules = 0
                var errorsCount = 0

                for await result in self.convertAndSaveGroups(groups: grouped, progress: progress) {
                    continuation.yield(result)

                    switch result.conversionInfo {
                    case .success(let info):
                        if let rulesText = info.advancedRulesText {
                            for rule in rulesText.split(separator: "\n") {
                                advancedRules.append("\(rule)")
                            }
                        }
                        sourceRulesCount += info.sourceRulesCount
                        sourceSafariCompatibleRulesCount += info.sourceSafariCompatibleRulesCount
                        safariRulesCount += info.safariRulesCount
                        advancedRulesCount += info.advancedRulesCount
                        discardedSafariRules += info.discardedSafariRules
                        errorsCount += info.errorsCount
                    case .failure(let error):
                        error.log("Can't convert rules for \(result.blockerType)")
                    }
                }

                var conversionResult: Result<ConversionInfo, BlockerConversionError>
                guard !progress.isCancelled else {
                    continuation.yield(.cancelled(blockerType: .advanced))
                    return
                }

                do {
                    let advancedRulesText = advancedRules.joined(separator: "\n")
                    _ = try self.webExtension.buildFilterEngine(rules: advancedRulesText)
                    conversionResult = .success(
                        .init(
                            sourceRulesCount: sourceRulesCount,
                            sourceSafariCompatibleRulesCount: sourceSafariCompatibleRulesCount,
                            safariRulesCount: safariRulesCount,
                            advancedRulesCount: advancedRulesCount,
                            discardedSafariRules: discardedSafariRules,
                            advancedRulesText: advancedRulesText,
                            errorsCount: errorsCount
                        )
                    )
                } catch {
                    conversionResult = .failure(.cantBuildAdvancedRules(error))
                }

                continuation.yield(
                    .init(
                        blockerType: .advanced,
                        conversionInfo: conversionResult
                    )
                )
            }
        }
    }
}
