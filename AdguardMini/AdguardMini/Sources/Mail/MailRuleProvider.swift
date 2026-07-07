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

final class MailRuleProviderImpl: MailRuleProvider {
    private let filterListManager: FLMProtocol

    init(filterListManager: FLMProtocol) {
        self.filterListManager = filterListManager
    }

    func mailFilterRules() async -> [String] {
        let rules = self.filterListManager.getRules(
            for: AdGuardAdditionalFilterId.mailTrackingProtection
        )
        return rules.map(\.ruleText)
    }

    func enabledUserRules() async -> [String] {
        let rules = self.filterListManager.getUserRules()
        return rules.filter { $0.isEnabled }.map(\.ruleText)
    }
}
