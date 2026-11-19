// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  RetryPolicyTests.swift
//  AdguardMiniTests
//

import XCTest

final class RetryPolicyTests: XCTestCase {
    /// The default schedule is 3 total attempts.
    func testMaxAttemptsIsThree() {
        XCTAssertEqual(RetryPolicy().maxAttempts, 3)
    }

    /// A retry is allowed after the first and second failure, but not further.
    func testRetryDecisionStopsAtTheAttemptLimit() {
        let policy = RetryPolicy()
        XCTAssertTrue(policy.shouldRetry(after: 1))
        XCTAssertTrue(policy.shouldRetry(after: 2))
        XCTAssertFalse(policy.shouldRetry(after: 3))
    }

    /// The backoff schedule is deterministic: 1 s then 2 s after failures.
    func testDelayScheduleDoublesAfterEachFailure() {
        let policy = RetryPolicy()
        XCTAssertEqual(policy.delay(after: 1), 1)
        XCTAssertEqual(policy.delay(after: 2), 2)
    }

    /// Custom parameters replace the defaults for the attempt limit and the base delay.
    func testCustomParametersApply() {
        let policy = RetryPolicy(maxAttempts: 5, baseDelaySeconds: 5)
        XCTAssertEqual(policy.maxAttempts, 5)
        XCTAssertEqual(policy.delay(after: 1), 5)
        XCTAssertEqual(policy.delay(after: 2), 10)
        XCTAssertEqual(policy.delay(after: 3), 20)
        XCTAssertEqual(policy.delay(after: 4), 40)
        XCTAssertTrue(policy.shouldRetry(after: 4))
        XCTAssertFalse(policy.shouldRetry(after: 5))
    }
}
