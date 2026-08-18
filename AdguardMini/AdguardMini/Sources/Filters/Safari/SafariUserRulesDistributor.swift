// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariUserRulesDistributor.swift
//  AdguardMini
//

import OrderedCollections

import ContentBlockerConverter

// MARK: - SafariUserRulesDistributor

/// Distributes user rules and service groups across Safari content blockers.
///
/// Encapsulates the tail of the user-rules conversion pipeline:
/// 1. Non-empty service groups are appended to `.other` before user rules.
/// 2. User rules are appended to every `ContentBlockerType.allCases`; affinity
///    routing is delegated to `AffinityRulesGrouper`.
/// 3. Each content blocker is deduplicated while preserving order.
enum SafariUserRulesDistributor {
    /// Builds the per-content-blocker rule map from filter rules, user rules,
    /// and service groups.
    ///
    /// - Parameters:
    ///   - filterRules: Base rules already grouped by content blocker type
    ///     (rules coming from filter lists).
    ///   - userRules: User rules, optionally prefixed with
    ///     `!#safari_cb_affinity(...)` directives.
    ///   - serviceGroups: Auxiliary rules added to `.other`.
    /// - Returns: A map from content blocker type to its deduplicated,
    ///   order-preserving rule list.
    static func distribute(
        filterRules: [(ContentBlockerType, [String])],
        userRules: [String],
        serviceGroups: [String]
    ) -> [ContentBlockerType: [String]] {
        var rulesByType = filterRules

        if !serviceGroups.isEmpty {
            rulesByType.append((.other, serviceGroups))
        }

        // User rules go to every content blocker.
        // `AffinityRulesGrouper` routes affinity-targeted rules.
        // Duplicates may appear, so we deduplicate after grouping.
        if !userRules.isEmpty {
            for type in ContentBlockerType.allCases {
                rulesByType.append((type, userRules))
            }
        }

        let grouped = AffinityRulesGrouper.group(rules: rulesByType)

        var deduplicatedGroups: [ContentBlockerType: [String]] = [:]
        for (type, rules) in grouped {
            deduplicatedGroups[type] = Array(OrderedSet(rules))
        }

        return deduplicatedGroups
    }
}
