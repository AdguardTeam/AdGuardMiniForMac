// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AllowBlockListRuleBuilder.swift
//  AdguardMini
//

import Foundation

// MARK: - AllowBlockListRuleBuilder

/// A builder for allowlist and blocklist rule strings used by the filtering
/// toggle feature.
///
/// Implementations define the rule syntax, domain prefixes, and modifier
/// ordering for the generated content blocker rules.
protocol AllowBlockListRuleBuilder {
    /// The `www.` subdomain prefix used for normalization.
    var wwwSubdomain: String { get }

    /// The separator between the domain and the modifier list in a rule.
    var separator: String { get }

    /// The list of modifiers for a rule in the order they should appear.
    var modifiers: [String] { get }

    /// Returns the rule prefix for an allowlist rule covering the given domain.
    func allowlistRulePrefix(for domain: String) -> String

    /// Returns a full allowlist rule with modifiers for the given domain.
    func basicAllowlistRule(for domain: String) -> String

    /// Returns the rule prefix for a blocklist rule covering the given domain.
    func blocklistRulePrefix(for domain: String) -> String

    /// Returns a full blocklist rule with modifiers for the given domain.
    func basicBlocklistRule(for domain: String) -> String

    /// Returns an inverted allowlist rule that covers all domains except the
    /// specified ones.
    func invertedAllowlistRule(for domains: [String]) -> String
}

// MARK: - AllowBlockListRuleBuilderImpl

/// Default implementation of ``AllowBlockListRuleBuilder``.
///
/// Generates rules with `||domain^` prefix and `$important,document` modifiers.
final class AllowBlockListRuleBuilderImpl: AllowBlockListRuleBuilder {
    let wwwSubdomain = "www."
    let separator = "^$"
    let modifiers = ["important", "document"]

    func basicAllowlistRule(for domain: String) -> String {
        "\(self.allowlistRulePrefix(for: domain))\(self.modifiers.joined(separator: ","))"
    }

    func allowlistRulePrefix(for domain: String) -> String {
        "@@||\(domain)\(self.separator)"
    }

    func basicBlocklistRule(for domain: String) -> String {
        "\(self.blocklistRulePrefix(for: domain))\(self.modifiers.joined(separator: ","))"
    }

    func blocklistRulePrefix(for domain: String) -> String {
        "||\(domain)\(self.separator)"
    }

    func invertedAllowlistRule(for domains: [String]) -> String {
        let baseRule = "@@||*$document"

        guard !domains.isEmpty else {
            return baseRule
        }

        let formattedDomains = domains.map { "~\($0)" }
                                      .joined(separator: "|")

        return "\(baseRule),domain=\(formattedDomains)"
    }
}
