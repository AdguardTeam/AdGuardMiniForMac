// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MockUrlFilteringChecker.swift
//  AdguardMiniTests
//

import Foundation

/// Mock implementation of `UrlFilteringChecker` for testing `FilteringDecision`.
/// Provides configurable responses for all protocol methods.
final class MockUrlFilteringChecker: UrlFilteringChecker {
    // Configurable closures for each method
    var basicAllowlistRuleHandler: (String) -> String = { domain in
        "@@||\(domain)^$important,document"
    }

    var basicBlocklistRuleHandler: (String) -> String = { domain in
        "||\(domain)^$important,document"
    }

    var isHostInAllowListHandler: (String, [String]) -> Bool = { _, _ in false }

    var isExactHostAllowlistedHandler: (String, [String]) -> Bool = { _, _ in false }

    var parentDomainsHandler: (String) -> [String] = { _ in [] }

    var coveringAllowlistRulesHandler: (String, [String]) -> [String] = { _, _ in [] }

    var hasBlockingExceptionHandler: (String, [String]) -> Bool = { _, _ in false }

    var hasBroaderParentAllowlistRuleHandler: (String, [String]) -> Bool = { _, _ in false }

    // Protocol conformance
    func basicAllowlistRule(for domain: String) -> String {
        self.basicAllowlistRuleHandler(domain)
    }

    func basicBlocklistRule(for domain: String) -> String {
        self.basicBlocklistRuleHandler(domain)
    }

    func isHostInAllowList(_ host: String, by rules: [String]) -> Bool {
        self.isHostInAllowListHandler(host, rules)
    }

    func isExactHostAllowlisted(_ host: String, by rules: [String]) -> Bool {
        self.isExactHostAllowlistedHandler(host, rules)
    }

    func parentDomains(for host: String) -> [String] {
        self.parentDomainsHandler(host)
    }

    func coveringAllowlistRules(for host: String, in rules: [String]) -> [String] {
        self.coveringAllowlistRulesHandler(host, rules)
    }

    func hasBlockingException(for host: String, in rules: [String]) -> Bool {
        self.hasBlockingExceptionHandler(host, rules)
    }

    func hasBroaderParentAllowlistRule(for host: String, in rules: [String]) -> Bool {
        self.hasBroaderParentAllowlistRuleHandler(host, rules)
    }
}
