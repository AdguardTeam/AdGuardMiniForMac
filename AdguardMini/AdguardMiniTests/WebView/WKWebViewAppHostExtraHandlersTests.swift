// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewAppHostExtraHandlersTests.swift
//  AdguardMiniTests
//

import XCTest
import WebKit

/// Tests `extraMessageHandlersSetup` init hook behavior.
final class WKWebViewAppHostExtraHandlersTests: XCTestCase {
    func testExtraMessageHandlersSetup_CalledExactlyOnceOnInit() {
        var callCount = 0
        _ = WKWebViewAppHost(
            module: .settings,
            entryURL: URL(fileURLWithPath: "/tmp/"),
            onVisibilityChange: nil,
            bridgeSetup: { _ in },
            extraMessageHandlersSetup: { _ in
                callCount += 1
            }
        )
        XCTAssertEqual(callCount, 1)
    }

    func testExtraMessageHandlersSetup_PassesNonNilUserContentController() {
        let captured = UserContentControllerCaptor()
        let host = WKWebViewAppHost(
            module: .settings,
            entryURL: URL(fileURLWithPath: "/tmp/"),
            onVisibilityChange: nil,
            bridgeSetup: { _ in },
            extraMessageHandlersSetup: { controller in
                captured.controller = controller
            }
        )
        XCTAssertNotNil(captured.controller)
        XCTAssertIdentical(
            captured.controller,
            host.webView.configuration.userContentController,
            "the seam must receive the SAME controller the web view dispatches messages from"
        )
    }

    func testExtraMessageHandlersSetup_DefaultsToNil_NoCrashWhenOmitted() {
        // Omitting optional closure must not crash.
        _ = WKWebViewAppHost(
            module: .settings,
            entryURL: URL(fileURLWithPath: "/tmp/"),
            onVisibilityChange: nil,
            bridgeSetup: { _ in },
            extraMessageHandlersSetup: nil
        )
    }

    func testTeardown_DestroysHost_WithoutCrashing() {
        let host = WKWebViewAppHost(
            module: .userrules,
            entryURL: URL(fileURLWithPath: "/tmp/"),
            onVisibilityChange: nil,
            bridgeSetup: { _ in },
            extraMessageHandlersSetup: nil
        )
        host.teardown()
        XCTAssertEqual(host.state, .destroyed)
        // Second teardown should also be safe.
        host.teardown()
        XCTAssertEqual(host.state, .destroyed, "second teardown stays destroyed")
    }
}

private final class UserContentControllerCaptor {
    var controller: WKUserContentController?
}
