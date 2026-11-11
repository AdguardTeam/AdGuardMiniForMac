// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailRuleProvider.swift
//  AdguardMini
//

import Foundation
import FLM

protocol MailRuleProvider {
    func mailFilterRules() async -> [String]
    func enabledUserRules() async -> [String]
}

/// Filter data the Mail ruleset is built from.
protocol MailRulesProviding {
    func isFilterEnabled(_ filterId: Int) -> Bool
    func isUserRulesEnabled() -> Bool
    func getRules(for filterId: Int) -> [FilterRule]
    func getUserRules() -> [FilterRule]
}

/// Adapts the filter-list manager to the narrow Mail rules source.
struct FLMMailRulesSource: MailRulesProviding {
    private let filterListManager: FLMProtocol

    init(_ filterListManager: FLMProtocol) {
        self.filterListManager = filterListManager
    }

    func isFilterEnabled(_ filterId: Int) -> Bool {
        self.filterListManager.isFilterEnabled(filterId)
    }

    func isUserRulesEnabled() -> Bool {
        self.filterListManager.isUserRulesEnabled()
    }

    func getRules(for filterId: Int) -> [FilterRule] {
        self.filterListManager.getRules(for: filterId)
    }

    func getUserRules() -> [FilterRule] {
        self.filterListManager.getUserRules()
    }
}

final class MailRuleProviderImpl: MailRuleProvider {
    private let filterListManager: MailRulesProviding

    init(filterListManager: MailRulesProviding) {
        self.filterListManager = filterListManager
    }

    // `@concurrent` so the blocking FLM read stays off the caller's actor.
    @concurrent
    func mailFilterRules() async -> [String] {
        let filterId = AdGuardAdditionalFilterId.mailTrackingProtection
        // A disabled filter must yield no rules, or Mail keeps blocking with the stale ruleset.
        guard self.filterListManager.isFilterEnabled(filterId) else {
            return []
        }
        let rules = self.filterListManager.getRules(for: filterId)
        return rules.map(\.ruleText)
    }

    // `@concurrent` so the blocking FLM read stays off the caller's actor.
    @concurrent
    func enabledUserRules() async -> [String] {
        // The list-wide switch turns every rule off, including the individually enabled ones.
        guard self.filterListManager.isUserRulesEnabled() else {
            return []
        }
        let rules = self.filterListManager.getUserRules()
        return rules.filter { $0.isEnabled }.map(\.ruleText)
    }
}
