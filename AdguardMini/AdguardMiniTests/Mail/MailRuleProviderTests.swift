// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailRuleProviderTests.swift
//  AdguardMiniTests
//

import FLM
import XCTest

/// Verifies the rules the Mail ruleset is built from: the mail filter yields
/// nothing while it is disabled, the user-rules list yields nothing while its
/// switch is off, and only enabled user rules are emitted.
final class MailRuleProviderTests: XCTestCase {
    /// Controllable stand-in for the filter data source.
    private final class FakeRulesProvider: MailRulesProviding {
        var filterEnabled = true
        var userRulesEnabled = true
        var rules: [FilterRule] = []
        var userRules: [FilterRule] = []
        private(set) var requestedFilterIds: [Int] = []

        func isFilterEnabled(_ filterId: Int) -> Bool {
            self.filterEnabled
        }

        func isUserRulesEnabled() -> Bool {
            self.userRulesEnabled
        }

        func getRules(for filterId: Int) -> [FilterRule] {
            self.requestedFilterIds.append(filterId)
            return self.rules
        }

        func getUserRules() -> [FilterRule] {
            self.userRules
        }
    }

    func testMailFilterRulesReturnsTheFilterRulesWhenTheFilterIsEnabled() async {
        let provider = FakeRulesProvider()
        provider.rules = [
            FilterRule(ruleText: "rule-one", isEnabled: true),
            FilterRule(ruleText: "rule-two", isEnabled: true)
        ]
        let ruleProvider = MailRuleProviderImpl(filterListManager: provider)

        let rules = await ruleProvider.mailFilterRules()

        XCTAssertEqual(rules, ["rule-one", "rule-two"])
        XCTAssertEqual(provider.requestedFilterIds.count, 1)
    }

    func testMailFilterRulesReturnsNothingWhenTheFilterIsDisabled() async {
        let provider = FakeRulesProvider()
        provider.filterEnabled = false
        provider.rules = [FilterRule(ruleText: "rule-one", isEnabled: true)]
        let ruleProvider = MailRuleProviderImpl(filterListManager: provider)

        let rules = await ruleProvider.mailFilterRules()

        XCTAssertTrue(rules.isEmpty)
        XCTAssertTrue(provider.requestedFilterIds.isEmpty)
    }

    func testEnabledUserRulesKeepsOnlyEnabledRules() async {
        let provider = FakeRulesProvider()
        provider.userRules = [
            FilterRule(ruleText: "enabled", isEnabled: true),
            FilterRule(ruleText: "disabled", isEnabled: false)
        ]
        let ruleProvider = MailRuleProviderImpl(filterListManager: provider)

        let rules = await ruleProvider.enabledUserRules()

        XCTAssertEqual(rules, ["enabled"])
    }

    func testEnabledUserRulesReturnsNothingWhenTheListIsDisabled() async {
        let provider = FakeRulesProvider()
        provider.userRulesEnabled = false
        provider.userRules = [FilterRule(ruleText: "enabled", isEnabled: true)]
        let ruleProvider = MailRuleProviderImpl(filterListManager: provider)

        let rules = await ruleProvider.enabledUserRules()

        XCTAssertTrue(rules.isEmpty)
    }
}
