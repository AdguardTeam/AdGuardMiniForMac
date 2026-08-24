// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  JsLogMessageHandlerTests.swift
//  AdguardMiniTests
//

import XCTest
import ProtoSchema // ScriptMessageHandling test seam.

final class JsLogMessageHandlerTests: XCTestCase {
    func testRoute_IsCalledWhenUnderTheRateLimit() {
        var current = Date(timeIntervalSince1970: 0)
        let limiter = TokenBucketLimiter(capacity: 60, refillPerSecond: 6) { current.timeIntervalSince1970 }
        var routed: [(String, String)] = []
        let handler = JsLogMessageHandler(
            module: .settings,
            rateLimiter: limiter
        ) { routed.append(($0, $1)) }
        let msg = StubScriptMessage(name: "jsLog", body: ["level": "info", "message": "hi"])
        handler.handle(message: msg)
        XCTAssertEqual(routed.count, 1)
        XCTAssertTrue(routed[0].0.contains("[JS:settings]"))
        XCTAssertEqual(routed[0].1, "hi")
    }

    func testRoute_IsNotCalled_WhenTheBudgetIsExhausted() {
        var current = Date(timeIntervalSince1970: 0)
        // `refillPerSecond` must be > 0 per `TokenBucketLimiter`'s precondition.
        // A non-advancing clock keeps the bucket from ever refilling, which is
        // The intent here (budget exhausted -> subsequent calls dropped).
        let limiter = TokenBucketLimiter(capacity: 1, refillPerSecond: 1) { current.timeIntervalSince1970 }
        var routed: [(String, String)] = []
        let handler = JsLogMessageHandler(module: .settings, rateLimiter: limiter) { routed.append(($0, $1)) }
        let msg = StubScriptMessage(name: "jsLog", body: ["level": "info", "message": "hi"])
        handler.handle(message: msg)  // allowed
        handler.handle(message: msg)  // dropped
        XCTAssertEqual(routed.count, 1)
    }
}

private struct StubScriptMessage: ScriptMessageHandling {
    let name: String
    let body: Any
}
