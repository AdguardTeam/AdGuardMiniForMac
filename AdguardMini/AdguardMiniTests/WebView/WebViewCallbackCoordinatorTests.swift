// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebViewCallbackCoordinatorTests.swift
//  AdguardMiniTests
//

import XCTest

/// Tests for the `onSafariExtensionUpdate` activity filter used by
/// `WebViewCallbackCoordinator.safariExtensionUpdate`
/// (`SafariExtensionActivity.shouldIgnore`, Sciter-master parity).
/// Process-boundary activities (`.conversion(.end)` / `.reload(.start)`) are
/// dropped so the UI does not interrupt its animations; the meaningful ones
/// are forwarded.
final class WebViewCallbackCoordinatorTests: XCTestCase {
    func testShouldIgnore_ConversionEnd() {
        XCTAssertTrue(SafariExtensionActivity.conversion(.end).shouldIgnore)
    }

    func testShouldIgnore_ReloadStart() {
        XCTAssertTrue(SafariExtensionActivity.reload(.start).shouldIgnore)
    }

    func testShouldIgnore_ConversionStart_IsForwarded() {
        XCTAssertFalse(SafariExtensionActivity.conversion(.start).shouldIgnore)
    }

    func testShouldIgnore_ReloadEnd_IsForwarded() {
        XCTAssertFalse(SafariExtensionActivity.reload(.end).shouldIgnore)
    }
}
