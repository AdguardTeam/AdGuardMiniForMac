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

    /// Logs the aggregate Safari rules conversion outcome in a single line.
    private static func logConversionResult(_ result: Result<ConversionInfo, BlockerConversionError>) {
        switch result {
        case .success(let info):
            LogInfo(
                "\(LogTag.safari) conversion end: " +
                "source=\(info.sourceRulesCount), safari=\(info.safariRulesCount), " +
                "advanced=\(info.advancedRulesCount), discarded=\(info.discardedSafariRules), " +
                "errors=\(info.errorsCount)"
            )
        case .failure(let error):
            LogError("\(LogTag.safari) conversion failed: \(error)")
        }
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
                            LogDebug("\(LogTag.safari) convertAndSave(\(safariBlockerType)) start")
                            let result = await self.convertAndSave(
                                safariBlockerType: safariBlockerType,
                                rules: rules,
                                isAdvancedBlocking: true,
                                progress: progress
                            )
                            LogDebug("\(LogTag.safari) convertAndSave(\(safariBlockerType)) end, \(convStart.elapsedMs())")
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
    // Mapping filter groups, distributing user rules, and building the
    // FilterEngine. The length reflects the sequential nature of the pipeline
    // Rather than any single complex sub-task, so the suppression is justified.
    // swiftlint:disable:next function_body_length
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

                let deduplicatedGroups = SafariUserRulesDistributor.distribute(
                    filterRules: rulesByType,
                    userRules: preparedFilters.userRulesList,
                    serviceGroups: preparedFilters.serviceGroups
                )

                var advancedRules: OrderedSet<String> = []
                var sourceRulesCount = 0
                var sourceSafariCompatibleRulesCount = 0
                var safariRulesCount = 0
                var advancedRulesCount = 0
                var discardedSafariRules = 0
                var errorsCount = 0

                for await result in self.convertAndSaveGroups(groups: deduplicatedGroups, progress: progress) {
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

                Self.logConversionResult(conversionResult)

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
