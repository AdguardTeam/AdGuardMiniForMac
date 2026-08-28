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
        var routed: [RoutedLog] = []
        let handler = JsLogMessageHandler(
            module: .settings,
            rateLimiter: limiter
        ) { level, tag, text in
            routed.append(RoutedLog(level: level, tag: tag, text: text))
        }
        let msg = StubScriptMessage(name: "jsLog", body: ["level": "info", "message": "hi"])
        handler.handle(message: msg)
        XCTAssertEqual(routed.count, 1)
        XCTAssertEqual(routed[0].level, .info)
        XCTAssertTrue(routed[0].tag.contains("[JS:settings]"))
        XCTAssertEqual(routed[0].text, "hi")
    }

    func testLevel_IsMappedFromThePost() {
        var routed: [RoutedLog] = []
        let handler = JsLogMessageHandler(
            module: .settings
        ) { level, tag, text in
            routed.append(RoutedLog(level: level, tag: tag, text: text))
        }
        let msg = StubScriptMessage(name: "jsLog", body: ["level": "error", "message": "boom"])
        handler.handle(message: msg)
        XCTAssertEqual(routed.count, 1)
        XCTAssertEqual(routed[0].level, .error)
    }

    func testUnknownLevel_FallsBackToInfo() {
        var routed: [RoutedLog] = []
        let handler = JsLogMessageHandler(
            module: .settings
        ) { level, tag, text in
            routed.append(RoutedLog(level: level, tag: tag, text: text))
        }
        let msg = StubScriptMessage(name: "jsLog", body: ["level": "bogus", "message": "hi"])
        handler.handle(message: msg)
        XCTAssertEqual(routed.count, 1)
        XCTAssertEqual(routed[0].level, .info)
    }

    func testRoute_IsNotCalled_WhenTheBudgetIsExhausted() {
        var current = Date(timeIntervalSince1970: 0)
        // `refillPerSecond` must be > 0 per `TokenBucketLimiter`'s precondition.
        // A non-advancing clock keeps the bucket from ever refilling, which is
        // The intent here (budget exhausted -> subsequent calls dropped).
        let limiter = TokenBucketLimiter(capacity: 1, refillPerSecond: 1) { current.timeIntervalSince1970 }
        var routed: [RoutedLog] = []
        let handler = JsLogMessageHandler(module: .settings, rateLimiter: limiter) { level, tag, text in
            routed.append(RoutedLog(level: level, tag: tag, text: text))
        }
        let msg = StubScriptMessage(name: "jsLog", body: ["level": "info", "message": "hi"])
        handler.handle(message: msg)  // allowed
        handler.handle(message: msg)  // dropped
        XCTAssertEqual(routed.count, 1)
    }
}

/// Captured JS log record for assertions.
private struct RoutedLog {
    let level: JsLogLevel
    let tag: String
    let text: String
}

private struct StubScriptMessage: ScriptMessageHandling {
    let name: String
    let body: Any
}
