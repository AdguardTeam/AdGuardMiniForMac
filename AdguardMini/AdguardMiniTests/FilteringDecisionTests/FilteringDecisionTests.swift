// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FilteringDecisionTests.swift
//  AdguardMiniTests
//

import XCTest

final class FilteringDecisionTests: XCTestCase {
    private var mockChecker: MockUrlFilteringChecker!

    override func setUp() {
        super.setUp()
        self.mockChecker = MockUrlFilteringChecker()
    }

    override func tearDown() {
        self.mockChecker = nil
        super.tearDown()
    }

    // MARK: - resolveEnable tests

    /// Scenario 1: Broader parent allowlist rule exists with existing blocking exception
    func testResolveEnable_BroaderParentWithExistingBlockingException() {
        // Given
        let host = "sub.example.com"
        let userRules = [
            "@@||example.com^$important,document", // broader parent
            "||sub.example.com^$important,document" // existing blocking exception
        ]

        self.mockChecker.hasBroaderParentAllowlistRuleHandler = { _, _ in true }
        self.mockChecker.hasBlockingExceptionHandler = { checkHost, rules in
            checkHost == host && rules.contains("||sub.example.com^$important,document")
        }

        // When
        let result = FilteringDecision.resolveEnable(
            host: host,
            rules: userRules,
            checker: self.mockChecker
        )

        // Then
        XCTAssertEqual(
            result.rulesToRemove,
            ["||sub.example.com^$important,document"],
            "Should remove existing blocking exception to avoid duplicates"
        )
        XCTAssertEqual(
            result.ruleToAdd,
            "||sub.example.com^$important,document",
            "Should add blocklist rule for the host"
        )
    }

    /// Scenario 2: Broader parent allowlist rule exists without blocking exception
    func testResolveEnable_BroaderParentWithoutBlockingException() {
        // Given
        let host = "sub.example.com"
        let userRules = [
            "@@||example.com^$important,document" // broader parent only
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
            "Should add blocklist rule for the host"
        )
    }

    /// Scenario 3: Only exact host allowlist rule exists (no broader parent)
    func testResolveEnable_ExactHostAllowlistOnly() {
        // Given
        let host = "example.com"
        let userRules = [
            "@@||example.com^$important,document" // exact host allowlist
        ]

        self.mockChecker.hasBroaderParentAllowlistRuleHandler = { _, _ in false }
        self.mockChecker.isExactHostAllowlistedHandler = { checkHost, rules in
            checkHost == host && rules.contains("@@||example.com^$important,document")
        }

        // When
        let result = FilteringDecision.resolveEnable(
            host: host,
            rules: userRules,
            checker: self.mockChecker
        )

        // Then
        XCTAssertEqual(
            result.rulesToRemove,
            ["@@||example.com^$important,document"],
            "Should remove exact host allowlist rule(s)"
        )
        XCTAssertNil(
            result.ruleToAdd,
            "Should not add any rule when removing exact allowlist"
        )
    }

    /// Scenario 4: No relevant rules for the host
    func testResolveEnable_NoRelevantRules() {
        // Given
        let host = "example.com"
        let userRules: [String] = []

        self.mockChecker.hasBroaderParentAllowlistRuleHandler = { _, _ in false }
        self.mockChecker.isExactHostAllowlistedHandler = { _, _ in false }

        // When
        let result = FilteringDecision.resolveEnable(
            host: host,
            rules: userRules,
            checker: self.mockChecker
        )

        // Then
        XCTAssertTrue(
            result.rulesToRemove.isEmpty,
            "Should not remove any rules when none exist"
        )
        XCTAssertNil(
            result.ruleToAdd,
            "Should not add any rule when no broader parent exists"
        )
    }

    /// Edge case: Empty host
    func testResolveEnable_EmptyHost() {
        // Given
        let host = ""
        let userRules: [String] = []

        // When
        let result = FilteringDecision.resolveEnable(
            host: host,
            rules: userRules,
            checker: self.mockChecker
        )

        // Then
        XCTAssertTrue(
            result.rulesToRemove.isEmpty,
            "Should return empty removals for empty host"
        )
        XCTAssertNil(
            result.ruleToAdd,
            "Should return nil addition for empty host"
        )
    }

    // MARK: - resolveDisable tests

    /// Scenario 1: Both blocking exception and covering parent allowlist rules exist
    func testResolveDisable_BlockingExceptionAndCoveringRules() {
        // Given
        let host = "sub.example.com"
        let userRules = [
            "||sub.example.com^$important,document", // blocking exception
            "@@||example.com^$important,document" // covering parent
        ]

        self.mockChecker.hasBlockingExceptionHandler = { checkHost, rules in
            checkHost == host && rules.contains("||sub.example.com^$important,document")
        }
        self.mockChecker.coveringAllowlistRulesHandler = { checkHost, _ in
            checkHost == host ? ["@@||example.com^$important,document"] : []
        }

        // When
        let result = FilteringDecision.resolveDisable(
            host: host,
            rules: userRules,
            checker: self.mockChecker
        )

        // Then
        XCTAssertEqual(
            Set(result.rulesToRemove),
            Set(["||sub.example.com^$important,document", "@@||example.com^$important,document"]),
            "Should remove both blocking exception and covering rules (deduplicated)"
        )
        XCTAssertEqual(
            result.ruleToAdd,
            "@@||sub.example.com^$important,document",
            "Should add allowlist rule for the host"
        )
    }

    /// Scenario 2: Only blocking exception exists (no covering rules)
    func testResolveDisable_BlockingExceptionOnly() {
        // Given
        let host = "example.com"
        let userRules = [
            "||example.com^$important,document" // blocking exception only
        ]

        self.mockChecker.hasBlockingExceptionHandler = { checkHost, rules in
            checkHost == host && rules.contains("||example.com^$important,document")
        }
        self.mockChecker.coveringAllowlistRulesHandler = { _, _ in [] }

        // When
        let result = FilteringDecision.resolveDisable(
            host: host,
            rules: userRules,
            checker: self.mockChecker
        )

        // Then
        XCTAssertEqual(
            result.rulesToRemove,
            ["||example.com^$important,document"],
            "Should remove only the blocking exception"
        )
        XCTAssertEqual(
            result.ruleToAdd,
            "@@||example.com^$important,document",
            "Should add allowlist rule for the host"
        )
    }

    /// Scenario 3: Only covering parent allowlist rules exist (no blocking exception)
    func testResolveDisable_CoveringRulesOnly() {
        // Given
        let host = "sub.example.com"
        let userRules = [
            "@@||example.com^$important,document" // covering parent only
        ]

        self.mockChecker.hasBlockingExceptionHandler = { _, _ in false }
        self.mockChecker.coveringAllowlistRulesHandler = { checkHost, _ in
            checkHost == host ? ["@@||example.com^$important,document"] : []
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
            ["@@||example.com^$important,document"],
            "Should remove covering parent rules"
        )
        XCTAssertEqual(
            result.ruleToAdd,
            "@@||sub.example.com^$important,document",
            "Should add allowlist rule for the host"
        )
    }

    /// Scenario 4: No relevant rules exist
    func testResolveDisable_NoRelevantRules() {
        // Given
        let host = "example.com"
        let userRules: [String] = []

        self.mockChecker.hasBlockingExceptionHandler = { _, _ in false }
        self.mockChecker.coveringAllowlistRulesHandler = { _, _ in [] }

        // When
        let result = FilteringDecision.resolveDisable(
            host: host,
            rules: userRules,
            checker: self.mockChecker
        )

        // Then
        XCTAssertTrue(
            result.rulesToRemove.isEmpty,
            "Should not remove any rules when none exist"
        )
        XCTAssertEqual(
            result.ruleToAdd,
            "@@||example.com^$important,document",
            "Should still add allowlist rule even when no rules to remove"
        )
    }

    /// Edge case: Empty host
    func testResolveDisable_EmptyHost() {
        // Given
        let host = ""
        let userRules: [String] = []

        // When
        let result = FilteringDecision.resolveDisable(
            host: host,
            rules: userRules,
            checker: self.mockChecker
        )

        // Then
        XCTAssertTrue(
            result.rulesToRemove.isEmpty,
            "Should return empty removals for empty host"
        )
        XCTAssertEqual(
            result.ruleToAdd,
            "@@||^$important,document",
            "Should delegate to checker for empty host rule generation"
        )
    }

    /// Edge case: Deduplication when same rule appears in both blocking exceptions and covering rules
    func testResolveDisable_Deduplication() {
        // Given
        let host = "example.com"
        let userRules = [
            "@@||example.com^$important,document"
        ]

        // Simulate a rule that matches both blocking exception and covering rule patterns
        self.mockChecker.hasBlockingExceptionHandler = { checkHost, rules in
            checkHost == host && rules.contains("@@||example.com^$important,document")
        }
        self.mockChecker.coveringAllowlistRulesHandler = { checkHost, _ in
            checkHost == host ? ["@@||example.com^$important,document"] : []
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
            ["@@||example.com^$important,document"],
            "Should deduplicate rules that appear in both sets"
        )
        XCTAssertEqual(
            result.ruleToAdd,
            "@@||example.com^$important,document",
            "Should add allowlist rule"
        )
    }
}
