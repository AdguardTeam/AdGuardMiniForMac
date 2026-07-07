// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailRulesetConversionResult.swift
//  AdguardMini
//

// MARK: - MailRulesetConversionResult

/// Holds the outcome of a single Mail ruleset conversion run.
struct MailRulesetConversionResult {
    let outcome: MailRulesetConversionOutcome
    let converterErrorCount: Int
    let writtenSuccessfully: Bool

    /// Total number of rules before the conversion started.
    let sourceRulesCount: Int

    /// Number of content-blocking rules written to the JSON.
    let jsonEntriesCount: Int

    /// Number of rules discarded due to OS/Safari limits.
    let discardedRules: Int
}
