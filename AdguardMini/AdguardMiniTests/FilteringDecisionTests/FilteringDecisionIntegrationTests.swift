// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FilteringDecisionIntegrationTests.swift
//  AdguardMiniTests
//

import XCTest

/// Integration tests that verify `FilteringDecision` works correctly with the real
/// `UrlFilteringCheckerImpl` implementation.
final class FilteringDecisionIntegrationTests: XCTestCase {
    private var checker: UrlFilteringCheckerImpl!

    override func setUp() {
        super.setUp()
        self.checker = UrlFilteringCheckerImpl(urlBuilder: AllowBlockListRuleBuilderImpl())
    }

    override func tearDown() {
        self.checker = nil
        super.tearDown()
    }

    // MARK: - resolveEnable integration tests

    /// Integration: broader parent allowlist rule exists
    func testResolveEnable_WithRealChecker_BroaderParentExists() {
        // Given
        let host = "sub.example.com"
        let rules = [
            "@@||example.com^$document,important" // broader parent allowlist
        ]

        // When
        let decision = FilteringDecision.resolveEnable(
            host: host,
            rules: rules,
            checker: self.checker
        )

        // Then
        XCTAssertTrue(
            decision.rulesToRemove.isEmpty,
            "No blocking exceptions to remove"
        )
        XCTAssertEqual(
            decision.ruleToAdd,
            "||sub.example.com^$important,document",
            "Should add blocking exception for the subdomain"
        )
    }

    /// Integration: broader parent with existing blocking exception
    func testResolveEnable_WithRealChecker_BroaderParentWithExistingException() {
        // Given
        let host = "sub.example.com"
        let rules = [
            "@@||example.com^$document,important", // broader parent
            "||sub.example.com^$document,important" // existing blocking exception
        ]

        // When
        let decision = FilteringDecision.resolveEnable(
            host: host,
            rules: rules,
            checker: self.checker
        )

        // Then
        XCTAssertEqual(
            decision.rulesToRemove,
            ["||sub.example.com^$document,important"],
            "Should remove existing blocking exception to avoid duplicates"
        )
        XCTAssertEqual(
            decision.ruleToAdd,
            "||sub.example.com^$important,document",
            "Should add blocking exception"
        )
    }

    /// Integration: exact host allowlist only
    func testResolveEnable_WithRealChecker_ExactHostAllowlist() {
        // Given
        let host = "example.com"
        let rules = [
            "@@||example.com^$document,important" // exact host allowlist
        ]

        // When
        let decision = FilteringDecision.resolveEnable(
            host: host,
            rules: rules,
            checker: self.checker
        )

        // Then
        XCTAssertEqual(
            decision.rulesToRemove,
            ["@@||example.com^$document,important"],
            "Should remove exact host allowlist rule"
        )
        XCTAssertNil(
            decision.ruleToAdd,
            "Should not add any rule"
        )
    }

    /// Integration: no relevant rules
    func testResolveEnable_WithRealChecker_NoRelevantRules() {
        // Given
        let host = "example.com"
        let rules: [String] = []

        // When
        let decision = FilteringDecision.resolveEnable(
            host: host,
            rules: rules,
            checker: self.checker
        )

        // Then
        XCTAssertTrue(decision.rulesToRemove.isEmpty)
        XCTAssertNil(decision.ruleToAdd)
    }

    // MARK: - resolveDisable integration tests

    /// Integration: blocking exception and covering rules exist
    func testResolveDisable_WithRealChecker_BlockingExceptionAndCovering() {
        // Given
        let host = "sub.example.com"
        let rules = [
            "||sub.example.com^$document,important", // blocking exception
            "@@||example.com^$document,important" // covering parent
        ]

        // When
        let decision = FilteringDecision.resolveDisable(
            host: host,
            rules: rules,
            checker: self.checker
        )

        // Then
        XCTAssertEqual(
            Set(decision.rulesToRemove),
            Set([
                "||sub.example.com^$document,important",
                "@@||example.com^$document,important"
            ]),
            "Should remove both blocking exception and covering rule"
        )
        XCTAssertEqual(
            decision.ruleToAdd,
            "@@||sub.example.com^$important,document",
            "Should add specific host allowlist"
        )
    }

    /// Integration: only blocking exception exists
    func testResolveDisable_WithRealChecker_BlockingExceptionOnly() {
        // Given
        let host = "example.com"
        let rules = [
            "||example.com^$document,important" // blocking exception only
        ]

        // When
        let decision = FilteringDecision.resolveDisable(
            host: host,
            rules: rules,
            checker: self.checker
        )

        // Then
        XCTAssertEqual(
            decision.rulesToRemove,
            ["||example.com^$document,important"],
            "Should remove blocking exception"
        )
        XCTAssertEqual(
            decision.ruleToAdd,
            "@@||example.com^$important,document",
            "Should add allowlist rule"
        )
    }

    /// Integration: only covering rules exist
    func testResolveDisable_WithRealChecker_CoveringRulesOnly() {
        // Given
        let host = "sub.example.com"
        let rules = [
            "@@||example.com^$document,important" // covering parent only
        ]

        // When
        let decision = FilteringDecision.resolveDisable(
            host: host,
            rules: rules,
            checker: self.checker
        )

        // Then
        XCTAssertEqual(
            decision.rulesToRemove,
            ["@@||example.com^$document,important"],
            "Should remove covering rule"
        )
        XCTAssertEqual(
            decision.ruleToAdd,
            "@@||sub.example.com^$important,document",
            "Should add specific host allowlist"
        )
    }

    /// Integration: no relevant rules
    func testResolveDisable_WithRealChecker_NoRelevantRules() {
        // Given
        let host = "example.com"
        let rules: [String] = []

        // When
        let decision = FilteringDecision.resolveDisable(
            host: host,
            rules: rules,
            checker: self.checker
        )

        // Then
        XCTAssertTrue(decision.rulesToRemove.isEmpty)
        XCTAssertEqual(
            decision.ruleToAdd,
            "@@||example.com^$important,document",
            "Should still add allowlist rule"
        )
    }
}
