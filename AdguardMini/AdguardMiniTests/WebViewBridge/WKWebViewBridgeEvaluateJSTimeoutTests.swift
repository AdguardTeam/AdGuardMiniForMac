// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewBridgeEvaluateJavaScriptTimeoutTests.swift
//  AdguardMiniTests
//

import XCTest
import ProtoSchema  // Bridge + protocol types

final class WKWebViewBridgeEvaluateJSTimeoutTests: XCTestCase {
    /// `WebViewAsyncInvoking` mock that never calls completion.
    private final class HangingWebView: WebViewAsyncInvoking {
        var lastInvocation: Result<
            (body: String, arguments: [String: Any]), Never
        >?

        func invoke(
            body: String,
            arguments: [String: Any],
            completion: ((Result<Any, Error>) -> Void)?
        ) {
            lastInvocation = .success((body, arguments))
            // Simulate hung JS evaluation.
        }
    }

    func testDispatchCallback_WhenInvokeHangs_FiresOnJavaScriptTimeout_WithMethodAndElapsed() async throws {
        let mock = HangingWebView()
        // The timer fires on the main queue, so synchronize on an expectation
        // (not a fixed sleep) to stay deterministic under CI load.
        let exp = expectation(description: "onJavaScriptTimeout fired")
        var recordedMethod: String?
        var recordedElapsed: TimeInterval?
        var fireCount = 0

        let bridge = WKWebViewBridge(webView: mock)
        bridge.evaluateJsTimeoutSeconds = 0.05
        bridge.onJavaScriptTimeout = { method, elapsed in
            recordedMethod = method
            recordedElapsed = elapsed
            fireCount += 1
            exp.fulfill()
        }
        bridge.dispatchCallback(
            method: "OnboardingCallbackService.OnEffectiveThemeChanged",
            data: Data([0x08, 0x01])
        )
        // Prove the JS shim was actually invoked before it hung.
        let invoked = try XCTUnwrap(mock.lastInvocation?.get())
        XCTAssertTrue(invoked.body.contains("__dispatchCallback"), "must invoke the JS shim before hanging")
        await fulfillment(of: [exp], timeout: 2)
        XCTAssertEqual(fireCount, 1, "onJavaScriptTimeout must fire exactly once")
        XCTAssertEqual(recordedMethod, "OnboardingCallbackService.OnEffectiveThemeChanged")
        XCTAssertNotNil(recordedElapsed, "elapsed time MUST be reported")
        XCTAssertGreaterThanOrEqual(recordedElapsed ?? 0, 0.05, "elapsed is at least the timeout")
    }

    func testDispatchCallback_WhenInvokeCompletes_DoesNotFireOnJavaScriptTimeout_FiresOnJavaScriptSuccess()
        async throws {
        let mock = MockWebView()  // completes immediately
        var timeoutFired = false
        var successFired = false

        let bridge = WKWebViewBridge(webView: mock)
        bridge.evaluateJsTimeoutSeconds = 0.1
        bridge.onJavaScriptTimeout = { _, _ in timeoutFired = true }
        bridge.onJavaScriptSuccess = { successFired = true }
        bridge.dispatchCallback(
            method: "OnboardingCallbackService.OnEffectiveThemeChanged",
            data: Data()
        )
        try await Task.sleep(nanoseconds: 200_000_000)
        XCTAssertFalse(timeoutFired, "onJavaScriptTimeout MUST NOT fire when completion returns first")
        XCTAssertTrue(successFired, "onJavaScriptSuccess MUST fire so the monitor resets")
    }
}
