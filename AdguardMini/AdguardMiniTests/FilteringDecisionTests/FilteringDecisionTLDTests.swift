// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FilteringDecisionTLDTests.swift
//  AdguardMiniTests
//

import XCTest

/// Tests for `FilteringDecision` covering scenarios where a TLD-level (single-label
/// parent) allowlist rule exists.
///
/// `parentDomains(for:)` includes single-label suffixes (TLD) by design – this is
/// intentional because the method is used for **searching** existing rules, not for
/// generating new ones. If a user explicitly added `@@||com^$important,document`,
/// the popup toggle must respect it.
final class FilteringDecisionTLDTests: XCTestCase {
    private var mockChecker: MockUrlFilteringChecker!

    override func setUp() {
        super.setUp()
        self.mockChecker = MockUrlFilteringChecker()
    }

    override func tearDown() {
        self.mockChecker = nil
        super.tearDown()
    }

    /// Verifies that a TLD-level allowlist rule is treated as a broader parent
    /// when enabling protection.
    func testResolveEnable_TLDRuleCoversHost() {
        // Given
        let host = "sub.example.com"
        let userRules = [
            "@@||com^$important,document" // TLD-level allowlist rule
        ]

        self.mockChecker.hasBroaderParentAllowlistRuleHandler = { _, _ in true }
        self.mockChecker.hasBlockingExceptionHandler = { _, _ in false }

        // When
        let result = FilteringDecision.resolveEnable(
            host: host,
            rules: userRules,
            checker: self.mockChecker
        )

        // Then
        XCTAssertTrue(
            result.rulesToRemove.isEmpty,
            "Should not remove any rules when no blocking exception exists"
        )
        XCTAssertEqual(
            result.ruleToAdd,
            "||sub.example.com^$important,document",
            "Should add blocklist rule to override the TLD allowlist"
        )
    }

    /// Verifies that a TLD-level allowlist rule is collected as a covering rule
    /// when disabling protection.
    func testResolveDisable_TLDRuleCoversHost() {
        // Given
        let host = "sub.example.com"
        let userRules = [
            "@@||com^$important,document" // TLD-level allowlist rule
        ]

        self.mockChecker.hasBlockingExceptionHandler = { _, _ in false }
        self.mockChecker.coveringAllowlistRulesHandler = { checkHost, _ in
            checkHost == host ? ["@@||com^$important,document"] : []
        }

        // When
        let result = FilteringDecision.resolveDisable(
            host: host,
            rules: userRules,
            checker: self.mockChecker
        )

        // Then
        XCTAssertEqual(
            result.rulesToRemove,
            ["@@||com^$important,document"],
            "Should remove the TLD-level allowlist rule"
        )
        XCTAssertEqual(
            result.ruleToAdd,
            "@@||sub.example.com^$important,document",
            "Should add a specific allowlist rule for the host"
        )
    }
}
