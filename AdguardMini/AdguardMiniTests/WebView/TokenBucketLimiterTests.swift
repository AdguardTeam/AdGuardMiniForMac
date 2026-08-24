// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TokenBucketLimiterTests.swift
//  AdguardMiniTests
//

import XCTest

final class TokenBucketLimiterTests: XCTestCase {
    private func makeClock() -> (now: () -> TimeInterval, advance: (TimeInterval) -> Void) {
        var current: TimeInterval = 0
        return ({ current }, { current += $0 })
    }

    func testBurst_IsBoundedByCapacity_AndLogsOnce() {
        let clock = makeClock()
        let limiter = TokenBucketLimiter(capacity: 2, refillPerSecond: 2, now: clock.now)
        XCTAssertEqual(limiter.tryConsume(), .allowed)
        XCTAssertEqual(limiter.tryConsume(), .allowed)
        XCTAssertEqual(limiter.tryConsume(), .limited(shouldLog: true))
        XCTAssertEqual(limiter.tryConsume(), .limited(shouldLog: false))
        XCTAssertEqual(limiter.tryConsume(), .limited(shouldLog: false))
    }

    func testRefill_ReplenishesTokensOverTime() {
        let clock = makeClock()
        let limiter = TokenBucketLimiter(capacity: 2, refillPerSecond: 2, now: clock.now)
        _ = limiter.tryConsume()
        _ = limiter.tryConsume()
        XCTAssertEqual(limiter.tryConsume(), .limited(shouldLog: true))
        clock.advance(0.5)
        XCTAssertEqual(limiter.tryConsume(), .allowed)
    }

    func testLogFlag_ResetsAfterAnAllowance() {
        let clock = makeClock()
        let limiter = TokenBucketLimiter(capacity: 1, refillPerSecond: 1, now: clock.now)
        XCTAssertEqual(limiter.tryConsume(), .allowed)
        XCTAssertEqual(limiter.tryConsume(), .limited(shouldLog: true))
        clock.advance(1)
        XCTAssertEqual(limiter.tryConsume(), .allowed)
        XCTAssertEqual(limiter.tryConsume(), .limited(shouldLog: true))
    }

    func testRefill_DoesNotAccumulateTokens_AboveCapacity() {
        // The limiter caps tokens at `capacity`; an arbitrarily idle period
        // Must not bank a burst beyond it.
        let clock = makeClock()
        let limiter = TokenBucketLimiter(capacity: 2, refillPerSecond: 1, now: clock.now)
        XCTAssertEqual(limiter.tryConsume(), .allowed)
        XCTAssertEqual(limiter.tryConsume(), .allowed)
        XCTAssertEqual(limiter.tryConsume(), .limited(shouldLog: true))
        clock.advance(100)
        XCTAssertEqual(limiter.tryConsume(), .allowed)
        XCTAssertEqual(limiter.tryConsume(), .allowed)
        XCTAssertEqual(limiter.tryConsume(), .limited(shouldLog: true))
    }
}
