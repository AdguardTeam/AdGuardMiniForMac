// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewFailurePresenterTests.swift
//  AdguardMiniTests
//

import XCTest
import AppKit

/// Verifies telemetry, alert, and restart behavior of live failure presenter.
final class WKWebViewFailurePresenterTests: XCTestCase {
    private final class Recorder {
        var telemetryEvents: [Telemetry.Event] = []
        var presentedAlertsCount = 0
        var restartInvokedCount = 0
    }

    private func makePresenter(
        _ recorder: Recorder,
        alertResponse: NSApplication.ModalResponse = .alertSecondButtonReturn
    ) -> WKWebViewFailurePresenter {
        WKWebViewFailurePresenter(
            recordTelemetry: { event in
                recorder.telemetryEvents.append(event)
            },
            presentAlert: { _ in
                recorder.presentedAlertsCount += 1
                return alertResponse
            },
            restartApp: {
                recorder.restartInvokedCount += 1
            }
        )
    }

    func testHandleLoadFailure_RecordsDistinctTelemetryCustomEvent_PresentsAlert() async {
        let recorder = Recorder()
        let presenter = makePresenter(recorder)
        await presenter.handleLoadFailure(
            module: "settings",
            error: NSError(domain: "test", code: 42)
        )
        XCTAssertEqual(recorder.telemetryEvents.count, 1)
        guard case .customEvent(let ev) = recorder.telemetryEvents.first else {
            XCTFail("expected .customEvent")
            return
        }
        XCTAssertEqual(ev.name, "wkwebview_load_failure")
        XCTAssertEqual(ev.refName, "settings")
        XCTAssertEqual(recorder.presentedAlertsCount, 1)
    }

    func testHandleJSRuntimeError_RecordsTelemetryWithStackAndPresentsAlert() async {
        let recorder = Recorder()
        let presenter = makePresenter(recorder)
        await presenter.handleJSRuntimeError(
            message: "undefined is not a function",
            stack: "at foo (bar.ts:1:2)"
        )
        XCTAssertEqual(recorder.presentedAlertsCount, 1)
        XCTAssertEqual(recorder.telemetryEvents.count, 1)
        guard case .customEvent(let ev) = recorder.telemetryEvents.first else {
            XCTFail("expected .customEvent")
            return
        }
        XCTAssertEqual(ev.name, "wkwebview_js_runtime_error")
        // Stack should remain in telemetry label.
        XCTAssertTrue(
            String(describing: ev.label).contains("at foo (bar.ts:1:2)"),
            "stack MUST be present in the telemetry label"
        )
    }

    func testHandleRecurringRpcTimeout_RecordsTelemetry_DoesNotPresentAlert() async {
        let recorder = Recorder()
        let presenter = makePresenter(recorder)
        await presenter.handleRecurringRpcTimeout()
        // Recurring RPC timeouts are telemetry/logging-only: a
        // Slow-but-alive module (e.g. the user-rules editor's initial load)
        // Must NOT surface a blocking "not responding / restart" dialog.
        XCTAssertEqual(recorder.presentedAlertsCount, 0)
        XCTAssertEqual(recorder.telemetryEvents.count, 1)
        guard case .customEvent(let ev) = recorder.telemetryEvents.first else {
            XCTFail("expected .customEvent")
            return
        }
        XCTAssertEqual(ev.name, "rpc_recurring_timeout")
        XCTAssertEqual(ev.refName, "webView")
    }

    func testHandleCSPViolation_RecordsTelemetry_DoesNotPresentAlert() async {
        let recorder = Recorder()
        let presenter = makePresenter(recorder)
        await presenter.handleCSPViolation(
            message: "CSP violation: blockedURI=inline violatedDirective=style-src-attr "
                + "effectiveDirective=style-src-attr",
            stack: "at animate (lottie.js:1:1)"
        )
        // CSP violations are telemetry/logging-only. A blocked inline style
        // From a third-party animation library (e.g. on macOS 12) is not a
        // Load failure and must not show a blocking dialog.
        XCTAssertEqual(recorder.presentedAlertsCount, 0)
        XCTAssertEqual(recorder.telemetryEvents.count, 1)
        guard case .customEvent(let ev) = recorder.telemetryEvents.first else {
            XCTFail("expected .customEvent")
            return
        }
        XCTAssertEqual(ev.name, "wkwebview_csp_violation")
        XCTAssertEqual(ev.refName, "webView")
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
