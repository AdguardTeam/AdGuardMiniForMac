// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FilteringDecision.swift
//  AdguardMini
//

import Foundation

/// Stateless namespace for filtering toggle decision logic.
///
/// Computes which rules to add or remove when enabling or disabling protection
/// for a specific host.
enum FilteringDecision {
    /// The outcome of a filtering toggle decision.
    struct RulesUpdate: Sendable, Equatable {
        /// Rule texts to remove (deduplicated).
        let rulesToRemove: [String]

        /// Rule text to add, or `nil` for no addition.
        let ruleToAdd: String?

        init(rulesToRemove: [String], ruleToAdd: String?) {
            self.rulesToRemove = rulesToRemove
            self.ruleToAdd = ruleToAdd
        }
    }

    /// Resolves the rules update for enabling protection on a host.
    ///
    /// - Parameters:
    ///   - host: The host to enable protection for.
    ///   - rules: Current set of enabled rules to analyze.
    ///   - checker: The URL filtering checker for rule analysis.
    /// - Returns: A `RulesUpdate` describing which rules to remove and optionally add.
    static func resolveEnable(
        host: String,
        rules: [String],
        checker: UrlFilteringChecker
    ) -> RulesUpdate {
        let hasBroaderParent = checker.hasBroaderParentAllowlistRule(for: host, in: rules)

        if hasBroaderParent {
            // Remove any existing blocking exceptions to avoid duplicates
            let rulesToRemove = rules.filter { rule in
                checker.hasBlockingException(for: host, in: [rule])
            }

            return RulesUpdate(
                rulesToRemove: rulesToRemove,
                ruleToAdd: checker.basicBlocklistRule(for: host)
            )
        }

        // No broader parent - remove exact host allowlist rules
        let rulesToRemove = rules.filter { rule in
            checker.isExactHostAllowlisted(host, by: [rule])
        }

        return RulesUpdate(
            rulesToRemove: rulesToRemove,
            ruleToAdd: nil
        )
    }

    /// Resolves the rules update for disabling protection on a host.
    ///
    /// - Parameters:
    ///   - host: The host to disable protection for.
    ///   - rules: Current set of enabled rules to analyze.
    ///   - checker: The URL filtering checker for rule analysis.
    /// - Returns: A `RulesUpdate` describing which rules to remove and the rule to add.
    static func resolveDisable(
        host: String,
        rules: [String],
        checker: UrlFilteringChecker
    ) -> RulesUpdate {
        // Collect blocking exceptions
        let blockingExceptions = rules.filter { rule in
            checker.hasBlockingException(for: host, in: [rule])
        }

        // Collect covering parent allowlist rules
        let coveringRules = checker.coveringAllowlistRules(for: host, in: rules)

        // Deduplicate: union of both sets
        var rulesToRemove: [String] = []
        for rule in blockingExceptions + coveringRules where !rulesToRemove.contains(rule) {
            rulesToRemove.append(rule)
        }

        return RulesUpdate(
            rulesToRemove: rulesToRemove,
            ruleToAdd: checker.basicAllowlistRule(for: host)
        )
    }
}
