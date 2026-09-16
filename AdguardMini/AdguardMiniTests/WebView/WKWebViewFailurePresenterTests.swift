// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewFailurePresenterTests.swift
//  AdguardMiniTests
//

import XCTest
import AppKit

/// Verifies alert and restart behavior of the live failure presenter.
final class WKWebViewFailurePresenterTests: XCTestCase {
    private final class Recorder {
        var presentedAlertsCount = 0
        var restartInvokedCount = 0
    }

    private func makePresenter(
        _ recorder: Recorder,
        alertResponse: NSApplication.ModalResponse = .alertSecondButtonReturn
    ) -> WKWebViewFailurePresenter {
        WKWebViewFailurePresenter(
            presentAlert: { _ in
                recorder.presentedAlertsCount += 1
                return alertResponse
            },
            restartApp: {
                recorder.restartInvokedCount += 1
            }
        )
    }

    func testHandleLoadFailure_PresentsAlert() async {
        let recorder = Recorder()
        let presenter = makePresenter(recorder)
        await presenter.handleLoadFailure(
            module: "settings",
            error: NSError(domain: "test", code: 42)
        )
        XCTAssertEqual(recorder.presentedAlertsCount, 1)
    }

    func testHandleJSRuntimeError_PresentsAlert() async {
        let recorder = Recorder()
        let presenter = makePresenter(recorder)
        await presenter.handleJSRuntimeError(
            message: "undefined is not a function",
            stack: "at foo (bar.ts:1:2)"
        )
        XCTAssertEqual(recorder.presentedAlertsCount, 1)
    }

    func testHandleRecurringRpcTimeout_DoesNotPresentAlert() async {
        let recorder = Recorder()
        let presenter = makePresenter(recorder)
        await presenter.handleRecurringRpcTimeout()
        // Recurring RPC timeouts are log-only: a slow-but-alive module (e.g.
        // The user-rules editor's initial load) must NOT surface a blocking
        // Restart dialog.
        XCTAssertEqual(recorder.presentedAlertsCount, 0)
    }

    func testHandleCSPViolation_DoesNotPresentAlert() async {
        let recorder = Recorder()
        let presenter = makePresenter(recorder)
        await presenter.handleCSPViolation(
            message: "CSP violation: blockedURI=inline violatedDirective=style-src-attr "
                + "effectiveDirective=style-src-attr",
            stack: "at animate (lottie.js:1:1)"
        )
        // A blocked inline style from a third-party animation library (e.g.
        // On macOS 12) is not a load failure and must not show a blocking
        // Dialog.
        XCTAssertEqual(recorder.presentedAlertsCount, 0)
    }

    func testHandleRpcError_DoesNotPresentAlert() async {
        let recorder = Recorder()
        let presenter = makePresenter(recorder)
        await presenter.handleRpcError(
            message: "RPC \"ThemeService.GetEffectiveTheme\" timed out after 600000 ms",
            stack: "at rpcCall (rpcPostMessage.ts:1:1)"
        )
        // A transient RPC transport failure must not offer a restart dialog.
        XCTAssertEqual(recorder.presentedAlertsCount, 0)
    }

    func testRestartButton_ClickInvokesRestartApp_NonRestartDoesNot() async {
        // Restart response should invoke restart callback.
        let restartRecorder = Recorder()
        let restartPresenter = makePresenter(restartRecorder, alertResponse: .alertSecondButtonReturn)
        await restartPresenter.handleLoadFailure(
            module: "tray",
            error: NSError(domain: "test", code: 1)
        )
        XCTAssertEqual(restartRecorder.restartInvokedCount, 1)

        // Non-restart response should not invoke restart callback.
        let reportRecorder = Recorder()
        let reportPresenter = makePresenter(reportRecorder, alertResponse: .alertFirstButtonReturn)
        await reportPresenter.handleLoadFailure(
            module: "tray",
            error: NSError(domain: "test", code: 1)
        )
        XCTAssertEqual(reportRecorder.restartInvokedCount, 0)
    }
}
