// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailRulesetConverting.swift
//  AdguardMini
//

import Foundation

protocol MailRulesetConverting {
    func convert(
        isEnabled: Bool,
        isPremium: Bool,
        filterRules: [String],
        userRules: [String]
    ) async -> MailRulesetConversionResult
}

import ContentBlockerConverter

// MARK: - Constants

private enum Constants {
    static let emptyRulesetJSON = "[]"
}

/// Converts filter and user rules into a Mail.app content blocking ruleset.
/// Produces a non-empty ruleset only when the toggle and Premium are both active.
final class MailRulesetConverter: MailRulesetConverting {
    // MARK: Private properties

    private let converter: FiltersConverter
    private let storage: MailRulesetStorage

    // MARK: Init

    init(converter: FiltersConverter, storage: MailRulesetStorage) {
        self.converter = converter
        self.storage = storage
    }

    // MARK: Conversion

    func convert(
        isEnabled: Bool,
        isPremium: Bool,
        filterRules: [String],
        userRules: [String]
    ) async -> MailRulesetConversionResult {
        guard isEnabled, isPremium else {
            // Toggle-off takes precedence over Premium-inactive.
            let outcome: MailRulesetConversionOutcome = isEnabled ? .nonPremium : .disabled
            return await self.writeEmpty(outcome: outcome)
        }

        return await self.convertAndWrite(filterRules: filterRules, userRules: userRules)
    }

    private func writeEmpty(outcome: MailRulesetConversionOutcome) async -> MailRulesetConversionResult {
        let data = Data(Constants.emptyRulesetJSON.utf8)
        let success = await self.storage.save(data)
        return MailRulesetConversionResult(
            outcome: outcome,
            converterErrorCount: 0,
            writtenSuccessfully: success,
            sourceRulesCount: 0,
            jsonEntriesCount: 0,
            discardedRules: 0
        )
    }

    private func convertAndWrite(filterRules: [String], userRules: [String]) async -> MailRulesetConversionResult {
        let combinedRules = filterRules + userRules

        // Mail does not support advanced blocking (scriptlets / CSS injection).
        // Advanced rules are therefore never written to `advancedRulesText`.
        let progress = Progress(totalUnitCount: Int64(combinedRules.count))
        let conversionResult = self.converter.convertArray(
            rules: combinedRules,
            isAdvancedBlocking: false,
            progress: progress
        )

        let data = Data(conversionResult.safariRulesJSON.utf8)
        let success = await self.storage.save(data)

        return MailRulesetConversionResult(
            outcome: .populated,
            converterErrorCount: conversionResult.errorsCount,
            writtenSuccessfully: success,
            sourceRulesCount: conversionResult.sourceRulesCount,
            jsonEntriesCount: conversionResult.safariRulesCount,
            discardedRules: conversionResult.discardedSafariRules
        )
    }
}
