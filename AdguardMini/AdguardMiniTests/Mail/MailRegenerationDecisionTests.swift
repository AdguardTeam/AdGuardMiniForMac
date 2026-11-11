// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailRegenerationDecisionTests.swift
//  AdguardMiniTests
//

import XCTest

/// Verifies which filter changes invalidate the Mail ruleset: the mail filter
/// and the user-rules filter both contribute rules to it, so changing either
/// must regenerate it.
final class MailRegenerationDecisionTests: XCTestCase {
    private let userRulesFilterId = 1000

    func testMailFilterChangeTriggersRegeneration() {
        let filterIds = [AdGuardAdditionalFilterId.mailTrackingProtection]

        XCTAssertTrue(
            MailRegenerationDecision.includesMailFilter(
                filterIds,
                userRulesFilterId: self.userRulesFilterId
            )
        )
    }

    func testUserRulesFilterChangeTriggersRegeneration() {
        XCTAssertTrue(
            MailRegenerationDecision.includesMailFilter(
                [self.userRulesFilterId],
                userRulesFilterId: self.userRulesFilterId
            )
        )
    }

    func testUnrelatedFilterChangeDoesNotTriggerRegeneration() {
        XCTAssertFalse(
            MailRegenerationDecision.includesMailFilter(
                [2, 3],
                userRulesFilterId: self.userRulesFilterId
            )
        )
    }
}
