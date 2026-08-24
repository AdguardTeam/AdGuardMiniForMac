// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppAlertWebViewFailuresTests.swift
//  AdguardMiniTests
//

import XCTest
import AppKit

/// Verifies `AppAlert` failure factories configure expected buttons and style.
final class AppAlertWebViewFailuresTests: XCTestCase {
    // The `AppAlert` factories are `@MainActor`-isolated and construct AppKit
    // `NSAlert`s; reading their state after the `await` must also run on the
    // Main actor to avoid an isolation violation / data race.
    @MainActor
    func testWebViewLoadFailureRequest_HasReportIssueAndRestartButtons_WithCriticalStyle() async {
        let alert = await AppAlert.webViewLoadFailureRequest(
            moduleName: "settings",
            errorMessage: "preview failure"
        )
        // In tests, localized button titles resolve to localization keys.
        XCTAssertEqual(alert.alertStyle, .critical)
        XCTAssertEqual(alert.buttons.count, 2)
        XCTAssertEqual(alert.buttons[0].title, .localized.base.report_issue_button)
        XCTAssertEqual(alert.buttons[1].title, .localized.base.restart_button)
        XCTAssertFalse(alert.messageText.isEmpty)
        XCTAssertFalse(alert.informativeText.isEmpty)
    }
}
