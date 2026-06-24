// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UrlFilteringCheckerTests.swift
//  AdguardMiniTests
//

import XCTest

// TLD-level rule tests extend the file beyond 400 lines.
// swiftlint:disable file_length
final class UrlFilteringCheckerTests: XCTestCase {
    private let fChecker = UrlFilteringCheckerImpl(urlBuilder: AllowBlockListRuleBuilderImpl())
    private let testHost = "example.com"
    private let testHost2 = "www.example.com"

    // MARK: - isHostInAllowList positive

    func testHostInAllowList1() {
        XCTAssertTrue(fChecker.isHostInAllowList(self.testHost, by: ["@@||example.com^$important,document"]))
    }

    func testHostInAllowList2() {
        XCTAssertTrue(fChecker.isHostInAllowList(self.testHost, by: ["@@||example.com^$document,important"]))
    }

    func testHostInAllowList3() {
        XCTAssertTrue(fChecker.isHostInAllowList(self.testHost, by: ["@@||example.com^$important,document,content"]))
    }

    func testHostInAllowList4() {
        XCTAssertTrue(fChecker.isHostInAllowList(self.testHost, by: ["@@||example.com^$document,content,important"]))
    }

    func testHostInAllowList5() {
        XCTAssertTrue(fChecker.isHostInAllowList(self.testHost, by: ["@@||www.example.com^$document,content,important"]))
    }

    func testHostInAllowList6() {
        XCTAssertTrue(fChecker.isHostInAllowList(self.testHost2, by: ["@@||example.com^$document,important"]))
    }

    func testNotHostInAllowList1() {
        XCTAssertFalse(fChecker.isHostInAllowList(self.testHost, by: []))
    }

    func testNotHostInAllowList2() {
        XCTAssertFalse(fChecker.isHostInAllowList(self.testHost, by: ["@@||example.com^$"]))
    }

    func testNotHostInAllowList3() {
        XCTAssertFalse(fChecker.isHostInAllowList(self.testHost, by: ["@@||example.com^$important"]))
    }

    func testNotHostInAllowList4() {
        XCTAssertFalse(fChecker.isHostInAllowList(self.testHost, by: ["@@||example.com^$document"]))
    }

    func testNotHostInAllowList5() {
        // swiftlint:disable:next force_try
        let content = try! String(contentsOf: Bundle.current.urlForFilter(number: 1)!)
            .components(separatedBy: CharacterSet.newlines)
        XCTAssertFalse(fChecker.isHostInAllowList(self.testHost, by: content))
    }

    // MARK: - Parent domain walking tests

    func testParentDomainWalkingMultiLevel() {
        let parents = fChecker.parentDomains(for: "deep.sub.example.com")
        XCTAssertEqual(parents, ["sub.example.com", "example.com", "com"])
    }

    func testParentDomainWalkingTwoLabels() {
        let parents = fChecker.parentDomains(for: "example.com")
        XCTAssertEqual(parents, ["com"])
    }

    func testParentDomainWalkingSingleLabel() {
        let parents = fChecker.parentDomains(for: "com")
        XCTAssertTrue(parents.isEmpty)
    }

    func testParentDomainWalkingIpAddress() {
        let parents = fChecker.parentDomains(for: "192.168.1.1")
        XCTAssertTrue(parents.isEmpty)
    }

    func testParentDomainWalkingWwwStripping() {
        let parents = fChecker.parentDomains(for: "www.sub.example.com")
        XCTAssertEqual(parents, ["sub.example.com", "example.com", "com"])
    }

    func testParentDomainWalkingWwwOnly() {
        let parents = fChecker.parentDomains(for: "www.example.com")
        XCTAssertEqual(parents, ["example.com", "com"])
    }

    func testParentDomainWalkingLocalhost() {
        let parents = fChecker.parentDomains(for: "localhost")
        XCTAssertTrue(parents.isEmpty)
    }

    func testParentDomainWalkingEmptyHost() {
        let parents = fChecker.parentDomains(for: "")
        XCTAssertTrue(parents.isEmpty)
    }

    // MARK: - Subdomain detection with parent allowlist rule

    func testSubdomainDetectedAsAllowlisted() {
        // Parent rule exists for example.com
        XCTAssertTrue(
            fChecker.isHostInAllowList(
                "sub.example.com",
                by: ["@@||example.com^$document,important"]
            )
        )
    }

    func testDeepSubdomainDetectedAsAllowlisted() {
        // Parent rule exists for example.com
        XCTAssertTrue(
            fChecker.isHostInAllowList(
                "deep.sub.example.com",
                by: ["@@||example.com^$document,important"]
            )
        )
    }

    func testBlockingExceptionOverridesParent() {
        // Parent allowlist rule + subdomain blocking rule = protection ON
        XCTAssertFalse(
            fChecker.isHostInAllowList(
                "sub.example.com",
                by: [
                    "@@||example.com^$document,important",
                    "||sub.example.com^$document,important"
                ]
            )
        )
    }

    func testBlockingExceptionOnlyForSpecificSubdomain() {
        // Blocking rule for sub.example.com should not affect deep.sub.example.com
        XCTAssertTrue(
            fChecker.isHostInAllowList(
                "deep.sub.example.com",
                by: [
                    "@@||example.com^$document,important",
                    "||sub.example.com^$document,important"
                ]
            )
        )
    }

    // MARK: - Covering allowlist rules

    func testCoveringAllowlistRulesFindsParent() {
        let rules = [
            "@@||example.com^$document,important",
            "@@||other.com^$document,important"
        ]
        let covering = fChecker.coveringAllowlistRules(for: "sub.example.com", in: rules)
        XCTAssertEqual(covering, ["@@||example.com^$document,important"])
    }

    func testCoveringAllowlistRulesFindsMultipleLevels() {
        let rules = [
            "@@||example.com^$document,important",
            "@@||sub.example.com^$document,important"
        ]
        let covering = fChecker.coveringAllowlistRules(for: "deep.sub.example.com", in: rules)
        XCTAssertEqual(
            covering.sorted(),
            ["@@||example.com^$document,important", "@@||sub.example.com^$document,important"].sorted()
        )
    }

    func testCoveringAllowlistRulesEmptyWhenNoMatch() {
        let rules = ["@@||other.com^$document,important"]
        let covering = fChecker.coveringAllowlistRules(for: "sub.example.com", in: rules)
        XCTAssertTrue(covering.isEmpty)
    }

    // MARK: - Blocking exception detection

    func testHasBlockingExceptionPositive() {
        let rules = [
            "@@||example.com^$document,important",
            "||sub.example.com^$document,important"
        ]
        XCTAssertTrue(fChecker.hasBlockingException(for: "sub.example.com", in: rules))
    }

    func testHasBlockingExceptionNegative() {
        let rules = ["@@||example.com^$document,important"]
        XCTAssertFalse(fChecker.hasBlockingException(for: "sub.example.com", in: rules))
    }

    func testHasBlockingExceptionWithoutImportant() {
        // Blocking rule missing `important` should NOT be recognized as an exception
        let rules = [
            "@@||example.com^$document,important",
            "||sub.example.com^$document"
        ]
        XCTAssertFalse(fChecker.hasBlockingException(for: "sub.example.com", in: rules))
    }

    func testHasBlockingExceptionWwwVariant() {
        // Blocking rule for www.sub.example.com should match sub.example.com
        let rules = [
            "@@||example.com^$document,important",
            "||www.sub.example.com^$document,important"
        ]
        XCTAssertTrue(fChecker.hasBlockingException(for: "sub.example.com", in: rules))
    }

    // MARK: - www variant in parent allowlist rule (US1 Scenario 4)

    func testWwwParentRuleDetectedForSubdomain() {
        // Rule @@||www.example.com^... should be detected when visiting sub.example.com
        XCTAssertTrue(
            fChecker.isHostInAllowList(
                "sub.example.com",
                by: ["@@||www.example.com^$document,important"]
            )
        )
    }

    func testWwwParentRuleDetectedForDeepSubdomain() {
        XCTAssertTrue(
            fChecker.isHostInAllowList(
                "deep.sub.example.com",
                by: ["@@||www.example.com^$document,important"]
            )
        )
    }

    // MARK: - isExactHostAllowlisted

    func testIsExactHostAllowlistedPositive() {
        XCTAssertTrue(
            fChecker.isExactHostAllowlisted(
                "sub.example.com",
                by: ["@@||sub.example.com^$document,important"]
            )
        )
    }

    func testIsExactHostAllowlistedNegativeParentRule() {
        // Parent rule should NOT make exact host allowlisted
        XCTAssertFalse(
            fChecker.isExactHostAllowlisted(
                "sub.example.com",
                by: ["@@||example.com^$document,important"]
            )
        )
    }

    func testIsExactHostAllowlistedWwwVariant() {
        // Rule for www.example.com should match example.com via www normalization
        XCTAssertTrue(
            fChecker.isExactHostAllowlisted(
                "example.com",
                by: ["@@||www.example.com^$document,important"]
            )
        )
    }

    // MARK: - hasBroaderParentAllowlistRule

    func testHasBroaderParentAllowlistRulePositive() {
        let rules = ["@@||example.com^$document,important"]
        XCTAssertTrue(
            fChecker.hasBroaderParentAllowlistRule(for: "sub.example.com", in: rules)
        )
    }

    func testHasBroaderParentAllowlistRuleNegativeExactMatch() {
        // Only exact host rule exists — no broader parent
        let rules = ["@@||sub.example.com^$document,important"]
        XCTAssertFalse(
            fChecker.hasBroaderParentAllowlistRule(for: "sub.example.com", in: rules)
        )
    }

    func testHasBroaderParentAllowlistRuleNegativeNoRules() {
        let rules: [String] = []
        XCTAssertFalse(
            fChecker.hasBroaderParentAllowlistRule(for: "sub.example.com", in: rules)
        )
    }

    func testHasBroaderParentAllowlistRuleWithBothExactAndParent() {
        // Both exact and parent rules exist — broader parent is present
        let rules = [
            "@@||example.com^$document,important",
            "@@||sub.example.com^$document,important"
        ]
        XCTAssertTrue(
            fChecker.hasBroaderParentAllowlistRule(for: "sub.example.com", in: rules)
        )
    }

    // MARK: - Edge cases

    func testParentDomainWalkingIPv6() {
        let parents = fChecker.parentDomains(for: "2001:db8::1")
        XCTAssertTrue(parents.isEmpty)
    }

    func testParentDomainWalkingIPv6Loopback() {
        let parents = fChecker.parentDomains(for: "::1")
        XCTAssertTrue(parents.isEmpty)
    }

    func testSubdomainNotAllowlistedWhenEmptyRules() {
        XCTAssertFalse(fChecker.isHostInAllowList("sub.example.com", by: []))
    }

    func testCoveringAllowlistRulesIncludesExactHost() {
        let rules = ["@@||sub.example.com^$document,important"]
        let covering = fChecker.coveringAllowlistRules(for: "sub.example.com", in: rules)
        XCTAssertEqual(covering, ["@@||sub.example.com^$document,important"])
    }

    func testCoveringAllowlistRulesWithWwwParentRule() {
        let rules = ["@@||www.example.com^$document,important"]
        let covering = fChecker.coveringAllowlistRules(for: "sub.example.com", in: rules)
        XCTAssertEqual(covering, ["@@||www.example.com^$document,important"])
    }

    func testRuleForSimilarDomainDoesNotMatch() {
        // @@||notexample.com should NOT match sub.example.com
        XCTAssertFalse(
            fChecker.isHostInAllowList(
                "sub.example.com",
                by: ["@@||notexample.com^$document,important"]
            )
        )
    }

    func testHostInAllowListWithIPAddress() {
        // IP addresses are checked exactly (no parent walking)
        XCTAssertTrue(
            fChecker.isHostInAllowList(
                "192.168.1.1",
                by: ["@@||192.168.1.1^$document,important"]
            )
        )
    }

    // MARK: - TLD-level rule scenarios

    func testHostInAllowListWithTLDRule() {
        // A TLD-level allowlist rule covers all hosts under that TLD.
        // This is intentional – `parentDomains` includes single-label suffixes.
        // It searches for existing rules and never generates new ones.
        XCTAssertTrue(
            fChecker.isHostInAllowList(
                "sub.example.com",
                by: ["@@||com^$important,document"]
            )
        )
    }

    func testHostInAllowListWithTLDRuleAndBlockingException() {
        // A blocking exception overrides even a TLD-level allowlist rule.
        // `HasBlockingException` checks only the exact host and takes
        // Precedence over the TLD-level allowlist.
        XCTAssertFalse(
            fChecker.isHostInAllowList(
                "sub.example.com",
                by: [
                    "@@||com^$important,document",
                    "||sub.example.com^$important,document"
                ]
            )
        )
    }

    func testCoveringAllowlistRulesFindsTLDRule() {
        // `CoveringAllowlistRules` should detect TLD-level rules
        // When walking parent domains.
        let rules = ["@@||com^$important,document"]
        let covering = fChecker.coveringAllowlistRules(for: "sub.example.com", in: rules)
        XCTAssertEqual(covering, ["@@||com^$important,document"])
    }

    func testHasBroaderParentAllowlistRuleWithTLDRule() {
        // A TLD-level rule is a broader parent rule since it covers
        // A single-label domain rather than the exact host.
        let rules = ["@@||com^$important,document"]
        XCTAssertTrue(
            fChecker.hasBroaderParentAllowlistRule(for: "sub.example.com", in: rules)
        )
    }

    func testHasBroaderParentAllowlistRuleNegativeForExactTLD() {
        // When the host itself is a single-label domain, `parentDomains`
        // Returns empty, so a TLD rule is exact, not broader.
        let rules = ["@@||com^$important,document"]
        XCTAssertFalse(
            fChecker.hasBroaderParentAllowlistRule(for: "com", in: rules)
        )
    }
}

private extension Bundle {
    static var current: Bundle {
        Bundle(for: UrlFilteringCheckerTests.self)
    }

    func urlForFilter(number: Int) -> URL? {
        self.url(forResource: "Filter\(number)", withExtension: "txt")
    }
}

// swiftlint:enable file_length
