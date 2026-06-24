// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UrlFilteringChecker.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - UrlFilteringChecker

/// Checks whether a host is allowlisted by user rules, including parent domain walking.
protocol UrlFilteringChecker {
    /// Returns the basic allowlist rule text for the given domain.
    func basicAllowlistRule(for domain: String) -> String
    /// Returns the basic blocklist rule text for the given domain.
    func basicBlocklistRule(for domain: String) -> String
    /// Returns `true` if the host (or any of its parent domains) is effectively allowlisted,
    /// unless overridden by a blocking exception for the exact host.
    func isHostInAllowList(_ host: String, by rules: [String]) -> Bool
    /// Returns `true` if the exact host (with www variants) has an allowlist rule.
    func isExactHostAllowlisted(_ host: String, by rules: [String]) -> Bool
    /// Generates all parent domains for the given host by walking labels from most-specific
    /// to the single-label stop condition. Skips IP addresses, localhost, and empty hosts.
    /// Normalizes by stripping the `www.` prefix before walking.
    ///
    /// - Note: The result **includes single-label (TLD) domains** (e.g. for `sub.example.com`
    ///   it returns `["example.com", "com"]`). This is intentional: the method is used for
    ///   **searching** existing allowlist rules, not for generating new ones. If a user has
    ///   explicitly added `@@||com^$important,document`, the popup toggle must respect it.
    func parentDomains(for host: String) -> [String]
    /// Returns all allowlist rules from `rules` that cover the given host or any of its
    /// parent domains, including www variants at each level.
    func coveringAllowlistRules(for host: String, in rules: [String]) -> [String]
    /// Returns `true` if a blocking exception rule (e.g. `||host^$document,important`)
    /// exists for the exact host or its www variant, with all required modifiers present.
    func hasBlockingException(for host: String, in rules: [String]) -> Bool
    /// Returns `true` if at least one allowlist rule covers a broader parent domain
    /// of the given host (i.e. the rule does not match the exact host itself).
    func hasBroaderParentAllowlistRule(for host: String, in rules: [String]) -> Bool
}

// MARK: - UrlFilteringCheckerImpl

/// Default implementation of ``UrlFilteringChecker``.
///
/// Uses an ``AllowBlockListRuleBuilder`` to construct rule prefixes for
/// matching, and walks parent domains to support allowlist coverage beyond
/// the exact host.
final class UrlFilteringCheckerImpl: UrlFilteringChecker {
    private let urlBuilder: AllowBlockListRuleBuilder

    init(urlBuilder: AllowBlockListRuleBuilder) {
        self.urlBuilder = urlBuilder
    }

    func basicAllowlistRule(for domain: String) -> String {
        self.urlBuilder.basicAllowlistRule(for: domain)
    }

    func basicBlocklistRule(for domain: String) -> String {
        self.urlBuilder.basicBlocklistRule(for: domain)
    }

    func parentDomains(for host: String) -> [String] {
        // Skip empty hosts and IP addresses.
        // Single-label hosts (e.g. "localhost", "com") are handled by the labels count check below.
        guard !host.isEmpty, !self.isIPAddress(host) else {
            return []
        }

        let hasWwwPrefix = host.hasPrefix(self.urlBuilder.wwwSubdomain)
        // Strip www. prefix before walking
        let normalizedHost = hasWwwPrefix
            ? String(host.dropFirst(self.urlBuilder.wwwSubdomain.count))
            : host

        let labels = normalizedHost.split(separator: ".")
        // Need at least 2 labels to have a parent
        guard labels.count >= 2 else {
            return []
        }

        var parents: [String] = []

        // If www was stripped, include the normalized host as the first parent
        if hasWwwPrefix {
            parents.append(normalizedHost)
        }

        // Walk from the first parent up to 1-label domain
        for startIndex in 1..<labels.count {
            let parentLabels = labels[startIndex...]
            parents.append(parentLabels.joined(separator: "."))
        }

        return parents
    }

    func isHostInAllowList(_ host: String, by rules: [String]) -> Bool {
        // If a blocking exception exists for this specific host, protection is ON
        if self.hasBlockingException(for: host, in: rules) {
            return false
        }

        // Check exact host (with www normalization)
        if self.checkHostWithWwwVariants(host, by: rules) {
            return true
        }

        // Walk parent domains
        for parent in self.parentDomains(for: host) {
            if self.checkHostWithWwwVariants(parent, by: rules) {
                return true
            }
        }

        return false
    }

    func coveringAllowlistRules(for host: String, in rules: [String]) -> [String] {
        var result: [String] = []

        // Collect all domains to check: the host itself + parent domains
        let domainsToCheck = [host] + self.parentDomains(for: host)

        for domain in domainsToCheck {
            for rule in rules {
                if self.isAllowlistRule(rule, for: domain) ||
                   self.isAllowlistRule(rule, for: self.urlBuilder.wwwSubdomain.appending(domain)) ||
                   self.isAllowlistRule(rule, for: domain.replacingOccurrences(
                       of: self.urlBuilder.wwwSubdomain, with: ""
                   )) {
                    if !result.contains(rule) {
                        result.append(rule)
                    }
                }
            }
        }

        return result
    }

    func hasBlockingException(for host: String, in rules: [String]) -> Bool {
        // Check exact host and www variant using prefix-only matching
        let blockPrefix = self.urlBuilder.blocklistRulePrefix(for: host)
        let wwwHost = host.hasPrefix(self.urlBuilder.wwwSubdomain)
            ? String(host.dropFirst(self.urlBuilder.wwwSubdomain.count))
            : self.urlBuilder.wwwSubdomain.appending(host)
        let wwwBlockPrefix = self.urlBuilder.blocklistRulePrefix(for: wwwHost)

        for rule in rules {
            if (rule.prefix(blockPrefix.count) == blockPrefix ||
                rule.prefix(wwwBlockPrefix.count) == wwwBlockPrefix) &&
               self.isValidModifierRule(rule) {
                return true
            }
        }
        return false
    }

    func isExactHostAllowlisted(_ host: String, by rules: [String]) -> Bool {
        self.checkHostWithWwwVariants(host, by: rules)
    }

    func hasBroaderParentAllowlistRule(for host: String, in rules: [String]) -> Bool {
        let covering = self.coveringAllowlistRules(for: host, in: rules)
        for rule in covering {
            // A rule is "broader" if it does NOT match the exact host (only a parent)
            if !self.isExactHostAllowlisted(host, by: [rule]) {
                return true
            }
        }
        return false
    }

    // MARK: - Private methods

    private func checkHostWithWwwVariants(_ host: String, by rules: [String]) -> Bool {
        if self.checkIsHostInAllowList(host, by: rules) {
            return true
        }

        if host.contains(self.urlBuilder.wwwSubdomain) {
            return self.checkIsHostInAllowList(
                host.replacingOccurrences(of: self.urlBuilder.wwwSubdomain, with: ""), by: rules
            )
        }
        return self.checkIsHostInAllowList(self.urlBuilder.wwwSubdomain.appending(host), by: rules)
    }

    func checkIsHostInAllowList(_ host: String, by rules: [String]) -> Bool {
        let allowlistRule = self.basicAllowlistRule(for: "\(host)")
        for rule in rules {
            if rule.prefix(allowlistRule.count) == allowlistRule ||
               self.isHostNotFiltered(host, rule: rule) {
                return true
            }
        }
        return false
    }

    private func isAllowlistRule(_ rule: String, for host: String) -> Bool {
        if self.isHostNotFiltered(host, rule: rule) {
            return true
        }
        let allowlistRule = self.basicAllowlistRule(for: host)
        return rule.prefix(allowlistRule.count) == allowlistRule
    }

    private func isHostNotFiltered(_ host: String, rule: String) -> Bool {
        let prefix = self.urlBuilder.allowlistRulePrefix(for: host)
        guard rule.prefix(prefix.count) == prefix else {
            return false
        }
        return self.isValidModifierRule(rule)
    }

    private func isValidModifierRule(_ rule: String) -> Bool {
        let components = rule.components(separatedBy: self.urlBuilder.separator)
        guard components.count > 1 else {
            return false
        }
        let modifiers = Set(components[1].components(separatedBy: ","))
        return Set(self.urlBuilder.modifiers).isSubset(of: modifiers)
    }

    private func isIPAddress(_ host: String) -> Bool {
        // Simple IPv4 check: all characters are digits or dots
        if host.allSatisfy({ $0.isNumber || $0 == "." }) {
            return true
        }
        // IPv6 check: contains colons
        if host.contains(":") {
            return true
        }
        return false
    }
}
