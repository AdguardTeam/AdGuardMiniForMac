// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  JsRuntimeErrorMessageHandlerTests.swift
//  AdguardMiniTests
//

import XCTest

final class JsRuntimeErrorMessageHandlerTests: XCTestCase {
    private enum Constants {
        static let maxUnknownKindLength = 128
    }

    func testSafeKind_PassesKnownKindsThroughAndReportsOthersByLength() {
        XCTAssertEqual(JsRuntimeErrorMessageHandler.safeKind("csp-violation"), "csp-violation")
        XCTAssertEqual(JsRuntimeErrorMessageHandler.safeKind("rpc-error"), "rpc-error")
        XCTAssertEqual(JsRuntimeErrorMessageHandler.safeKind(nil), "none")
        XCTAssertEqual(JsRuntimeErrorMessageHandler.safeKind("boom"), "unknown(4)")
    }

    func testSafeKind_MarksTruncationOnlyWhenTheKindIsLongerThanTheCap() {
        let atCap = String(repeating: "a", count: Constants.maxUnknownKindLength)
        let overCap = atCap + "a"

        XCTAssertEqual(
            JsRuntimeErrorMessageHandler.safeKind(atCap),
            "unknown(\(Constants.maxUnknownKindLength))"
        )
        XCTAssertEqual(
            JsRuntimeErrorMessageHandler.safeKind(overCap),
            "unknown(\(Constants.maxUnknownKindLength)+)"
        )
    }
}
