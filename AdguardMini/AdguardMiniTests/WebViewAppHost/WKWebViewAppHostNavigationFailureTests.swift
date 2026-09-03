// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewAppHostNavigationFailureTests.swift
//  AdguardMiniTests
//

import XCTest
import ProtoSchema

/// Recording test double for `WKWebViewFailurePresenting`.
private final class RecordingFailurePresenter: WKWebViewFailurePresenting {
    struct LoadFailureCall {
        let module: String
        let errorDesc: String
        let domain: String
        let code: Int
    }
    var loadFailureCalls: [LoadFailureCall] = []
    struct JSRuntimeErrorCall { let message: String; let stack: String? }
    var jsRuntimeErrorCalls: [JSRuntimeErrorCall] = []
    struct CSPViolationCall { let message: String; let stack: String? }
    var cspViolationCalls: [CSPViolationCall] = []
    struct RpcErrorCall { let message: String; let stack: String? }
    var rpcErrorCalls: [RpcErrorCall] = []
    var rpcTimeoutAlertCalls = 0
    /// Optional hook so tests can synchronize on routing (replaces fixed sleeps).
    var onLoadFailure: (() -> Void)?

    func handleLoadFailure(module: String, error: Error) async {
        // `localizedDescription` is locale-dependent (e.g. Russian "ошибка 42"
        // Here), so also capture the stable `NSError` domain/code for exact
        // Assertions.
        let nsError = error as NSError
        loadFailureCalls.append(
            .init(module: module, errorDesc: error.localizedDescription, domain: nsError.domain, code: nsError.code)
        )
        onLoadFailure?()
    }
    func handleJSRuntimeError(message: String, stack: String?) async {
        jsRuntimeErrorCalls.append(.init(message: message, stack: stack))
    }
    func handleCSPViolation(message: String, stack: String?) async {
        cspViolationCalls.append(.init(message: message, stack: stack))
    }
    func handleRpcError(message: String, stack: String?) async {
        rpcErrorCalls.append(.init(message: message, stack: stack))
    }
    func handleRecurringRpcTimeout() async {
        rpcTimeoutAlertCalls += 1
    }
}

final class WKWebViewAppHostNavigationFailureTests: XCTestCase {
    @MainActor
    private func makeHost(presenter: RecordingFailurePresenter) -> WKWebViewAppHost {
        let host = WKWebViewAppHost(
            module: .settings,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/settings.html"),
            onVisibilityChange: nil,
            failurePresenter: presenter,
            // Labeled parameter `bridgeSetup` describes the closure's role explicitly.
            // swiftlint:disable:next trailing_closure
            bridgeSetup: { _ in }
        )
        // Tear down each host so its real `WKWebView` and WebContent process
        // Released before the next test: leaked hosts accumulate on parallel CI
        // Shards and stall the main executor past the fulfillment timeout.
        addTeardownBlock { host.teardown() }
        return host
    }

    @MainActor
    func testDidFailProvisionalNavigation_InvokesPresenter_RoutesToStateError() async {
        let presenter = RecordingFailurePresenter()
        let host = makeHost(presenter: presenter)
        var fulfilled = false
        let exp = expectation(description: "load failure routed to presenter")
        presenter.onLoadFailure = {
            if !fulfilled { fulfilled = true; exp.fulfill() }
        }
        host.loadEntryIfNeeded()
        host.didFailProvisionalNavigation(error: NSError(domain: "test", code: 42))
        await fulfillment(of: [exp], timeout: 10)
        XCTAssertEqual(host.state, .error)
        XCTAssertEqual(presenter.loadFailureCalls.count, 1)
        XCTAssertEqual(presenter.loadFailureCalls.first?.module, "settings")
        // Assert on the locale-independent `NSError` domain/code (the
        // LocalizedDescription text varies by system language).
        XCTAssertEqual(presenter.loadFailureCalls.first?.domain, "test")
        XCTAssertEqual(presenter.loadFailureCalls.first?.code, 42)
    }

    @MainActor
    func testDidFail_NonProvisionalNavigation_InvokesPresenter_RoutesToStateError() async {
        let presenter = RecordingFailurePresenter()
        let host = makeHost(presenter: presenter)
        var fulfilled = false
        let exp = expectation(description: "load failure routed to presenter")
        presenter.onLoadFailure = {
            if !fulfilled { fulfilled = true; exp.fulfill() }
        }
        host.loadEntryIfNeeded()
        host.webView(host.webView, didFail: nil, withError: NSError(domain: "test", code: 7))
        await fulfillment(of: [exp], timeout: 10)
        XCTAssertEqual(host.state, .error)
        XCTAssertEqual(presenter.loadFailureCalls.count, 1)
        XCTAssertEqual(presenter.loadFailureCalls.first?.module, "settings")
        // Locale-independent `NSError` domain/code check (see previous test).
        XCTAssertEqual(presenter.loadFailureCalls.first?.domain, "test")
        XCTAssertEqual(presenter.loadFailureCalls.first?.code, 7)
    }

    func testRpcTimeoutAlertMessageHandler_RoutesToPresenter() async {
        let presenter = RecordingFailurePresenter()
        // Construct handler and feed synthesized message.
        let handler = RpcTimeoutAlertMessageHandler(presenter: presenter)
        let message = MockScriptMessageForHandler(
            name: "rpcTimeoutAlert",
            body: ["count": 3]
        )
        // Wait for async presenter call.
        handler.handle(message: message)
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(presenter.rpcTimeoutAlertCalls, 1)
    }

    func testRpcTimeoutAlertMessageHandler_RejectsInvalidCount() async {
        let presenter = RecordingFailurePresenter()
        let handler = RpcTimeoutAlertMessageHandler(presenter: presenter)
        let message = MockScriptMessageForHandler(name: "rpcTimeoutAlert", body: ["count": -5])
        handler.handle(message: message)
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(presenter.rpcTimeoutAlertCalls, 0)
    }

    func testRpcTimeoutAlertMessageHandler_ClampsAlertsToOnePerWindow() async {
        var current = Date(timeIntervalSince1970: 0)
        let presenter = RecordingFailurePresenter()
        let handler = RpcTimeoutAlertMessageHandler(presenter: presenter) { current }
        let message = MockScriptMessageForHandler(name: "rpcTimeoutAlert", body: ["count": 3])
        handler.handle(message: message)  // alert 1
        handler.handle(message: message)  // clamped
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(presenter.rpcTimeoutAlertCalls, 1)
    }

    func testJsRuntimeErrorMessageHandler_RoutesToPresenter() async {
        let presenter = RecordingFailurePresenter()
        let handler = JsRuntimeErrorMessageHandler(presenter: presenter)
        let message = MockScriptMessageForHandler(
            name: "jsRuntimeError",
            body: ["message": "boom", "stack": "at foo()"]
        )
        handler.handle(message: message)
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(presenter.jsRuntimeErrorCalls.count, 1)
        XCTAssertEqual(presenter.jsRuntimeErrorCalls[0].message, "boom")
        // Stack must be forwarded.
        XCTAssertEqual(presenter.jsRuntimeErrorCalls[0].stack, "at foo()")
    }

    func testJsRuntimeErrorMessageHandler_RateLimit_DropsAfterBurst() async {
        var current: TimeInterval = 0
        // `refillPerSecond` must be > 0 per `TokenBucketLimiter`'s precondition.
        // A non-advancing clock keeps the rate limiter from ever refilling.
        let limiter = TokenBucketLimiter(capacity: 1, refillPerSecond: 1) { current }
        let presenter = RecordingFailurePresenter()
        let handler = JsRuntimeErrorMessageHandler(presenter: presenter, rateLimiter: limiter)
        let message = MockScriptMessageForHandler(name: "jsRuntimeError", body: ["message": "boom"])

        handler.handle(message: message)  // allowed
        handler.handle(message: message)  // dropped
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(presenter.jsRuntimeErrorCalls.count, 1)
    }

    func testJsRuntimeErrorMessageHandler_RpcErrorSkipsTokenBucket() async {
        var current: TimeInterval = 0
        // A non-advancing clock keeps the rate limiter from ever refilling,
        // So a single genuine error exhausts the bucket for good.
        let limiter = TokenBucketLimiter(capacity: 1, refillPerSecond: 1) { current }
        let presenter = RecordingFailurePresenter()
        let handler = JsRuntimeErrorMessageHandler(presenter: presenter, rateLimiter: limiter)
        let rpcError = MockScriptMessageForHandler(
            name: "jsRuntimeError",
            body: ["message": "RPC timeout", "kind": "rpc-error"]
        )
        let runtimeError = MockScriptMessageForHandler(
            name: "jsRuntimeError",
            body: ["message": "boom"]
        )

        // A burst of non-fatal RPC failures (a stuck native side rejects every
        // Pending RPC) must not consume the token bucket: the genuine runtime
        // Error that follows must still be able to present its alert.
        handler.handle(message: rpcError)
        handler.handle(message: rpcError)
        handler.handle(message: runtimeError)
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(presenter.rpcErrorCalls.count, 2)
        XCTAssertEqual(presenter.jsRuntimeErrorCalls.count, 1,
                       "Non-fatal RPC posts must not exhaust the genuine-error bucket")
    }

    func testJsRuntimeErrorMessageHandler_NonFatalPostsConsumeTheirOwnBucket() async {
        let current: TimeInterval = 0
        // A non-advancing clock keeps both buckets from refilling. The
        // Non-fatal bucket holds a single token, so the second rpc-error
        // Post must be dropped — an unbounded non-fatal surface would let a
        // Spamming page flood the unified log and telemetry.
        let nonFatalLimiter = TokenBucketLimiter(capacity: 1, refillPerSecond: 1) { current }
        let presenter = RecordingFailurePresenter()
        let handler = JsRuntimeErrorMessageHandler(
            presenter: presenter,
            nonFatalRateLimiter: nonFatalLimiter
        )
        let rpcError = MockScriptMessageForHandler(
            name: "jsRuntimeError",
            body: ["message": "RPC timeout", "kind": "rpc-error"]
        )
        let runtimeError = MockScriptMessageForHandler(
            name: "jsRuntimeError",
            body: ["message": "boom"]
        )

        handler.handle(message: rpcError)
        handler.handle(message: rpcError)
        // The genuine-error path draws from the main bucket, which the
        // Non-fatal posts (allowed or dropped) must leave untouched.
        handler.handle(message: runtimeError)
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(presenter.rpcErrorCalls.count, 1,
                       "The second non-fatal post must be dropped by the non-fatal bucket")
        XCTAssertEqual(presenter.jsRuntimeErrorCalls.count, 1)
    }

    func testJsRuntimeErrorMessageHandler_RoutesCSPViolationToNonFatalPresenterMethod() async {
        let presenter = RecordingFailurePresenter()
        let handler = JsRuntimeErrorMessageHandler(presenter: presenter)
        let message = MockScriptMessageForHandler(
            name: "jsRuntimeError",
            body: [
                "message": "CSP violation: blockedURI=inline violatedDirective=style-src-attr "
                    + "effectiveDirective=style-src-attr",
                "stack": "at animate()",
                "kind": "csp-violation"
            ]
        )
        handler.handle(message: message)
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(presenter.cspViolationCalls.count, 1)
        XCTAssertEqual(
            presenter.cspViolationCalls[0].message,
            "CSP violation: blockedURI=inline violatedDirective=style-src-attr effectiveDirective=style-src-attr"
        )
        XCTAssertEqual(presenter.cspViolationCalls[0].stack, "at animate()")
        XCTAssertEqual(presenter.jsRuntimeErrorCalls.count, 0)
    }

    func testJsRuntimeErrorMessageHandler_RoutesRpcErrorToNonFatalPresenterMethod() async {
        let presenter = RecordingFailurePresenter()
        let handler = JsRuntimeErrorMessageHandler(presenter: presenter)
        let message = MockScriptMessageForHandler(
            name: "jsRuntimeError",
            body: [
                "message": "RPC \"ThemeService.GetEffectiveTheme\" timed out after 600000 ms",
                "stack": "at rpcCall (rpcPostMessage.ts:1:1)",
                "kind": "rpc-error"
            ]
        )
        handler.handle(message: message)
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(presenter.rpcErrorCalls.count, 1)
        XCTAssertEqual(
            presenter.rpcErrorCalls[0].message,
            "RPC \"ThemeService.GetEffectiveTheme\" timed out after 600000 ms"
        )
        XCTAssertEqual(presenter.rpcErrorCalls[0].stack, "at rpcCall (rpcPostMessage.ts:1:1)")
        // An RPC failure is not a page failure: no fatal alert surface.
        XCTAssertEqual(presenter.jsRuntimeErrorCalls.count, 0)
    }

    func testJsRuntimeErrorMessageHandler_RpcErrorSkipsAlertThrottle() async {
        var current: TimeInterval = 0
        let presenter = RecordingFailurePresenter()
        let handler = JsRuntimeErrorMessageHandler(presenter: presenter) { current }
        let rpcError = MockScriptMessageForHandler(
            name: "jsRuntimeError",
            body: ["message": "RPC timeout", "kind": "rpc-error"]
        )
        let runtimeError = MockScriptMessageForHandler(
            name: "jsRuntimeError",
            body: ["message": "boom"]
        )
        // A non-fatal RPC error must not advance the alert throttle: the
        // Genuine runtime error that follows can still present an alert.
        handler.handle(message: rpcError)
        handler.handle(message: runtimeError)
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(presenter.rpcErrorCalls.count, 1)
        XCTAssertEqual(presenter.jsRuntimeErrorCalls.count, 1)
    }

    func testJsRuntimeErrorMessageHandler_CSPViolationSkipsAlertThrottle() async {
        var current: TimeInterval = 0
        let presenter = RecordingFailurePresenter()
        let handler = JsRuntimeErrorMessageHandler(presenter: presenter) { current }
        let cspViolation = MockScriptMessageForHandler(
            name: "jsRuntimeError",
            body: ["message": "CSP violation: blockedURI=inline", "kind": "csp-violation"]
        )
        let runtimeError = MockScriptMessageForHandler(
            name: "jsRuntimeError",
            body: ["message": "boom"]
        )
        // A CSP violation must not advance the alert throttle. The genuine
        // Runtime error that follows can still present an alert.
        handler.handle(message: cspViolation)
        handler.handle(message: runtimeError)
        try? await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(presenter.cspViolationCalls.count, 1)
        XCTAssertEqual(presenter.jsRuntimeErrorCalls.count, 1)
    }
}

/// Test seam message for `handle(message:)`.
private struct MockScriptMessageForHandler: ScriptMessageHandling {
    let name: String
    let body: Any
}
