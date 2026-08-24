// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  GeneratedBridgeRoundTripTests.swift
//  AdguardMiniTests
//

import XCTest
import ProtoSchema  // Public surface; no @testable import per AGENTS.md  III.2

/// Round-trip checks for regenerated service and callback bridges.
final class GeneratedBridgeRoundTripTests: XCTestCase {
    /// `ThemeService.handleRequest` should return valid serialized reply bytes.
    func testRegenerated_ThemeService_HandleRequest_RoundTripsEmptyValueRequest() throws {
        let service = StubThemeService()
        let exp = expectation(description: "handleRequest promise called")
        var roundTrippedValue: EffectiveThemeValue?
        service.handleRequest(
            method: "GetEffectiveTheme",
            bytes: try EmptyValue().serializedData()
        ) { replyBytes in
            XCTAssertFalse(replyBytes.isEmpty, "Reply bytes must be non-empty for a successful RPC")
            roundTrippedValue = try? EffectiveThemeValue(serializedBytes: replyBytes)
            exp.fulfill()
        }
        wait(for: [exp], timeout: 1.0)
        // Assert the round-tripped VALUE, not just deserializability, so a
        // Mangled non-zero enum case would be caught (the stub returns `.dark`).
        let reply = try XCTUnwrap(roundTrippedValue, "Reply must deserialize into EffectiveThemeValue")
        XCTAssertEqual(reply.value, .dark, "Round-tripped theme value must be preserved")
    }

    /// Callback should dispatch through bridge when attached.
    func testRegenerated_SettingsCallbackService_DualDispatch_BridgeAttachedCallsDispatchCallback() {
        let callback = SettingsCallbackService()
        let mockWebView = CapturingMockWebView()
        let mockBridge = WKWebViewBridge(webView: mockWebView)
        callback.attach(webViewBridge: mockBridge)
        let message = SafariExtensionUpdate()
        _ = callback.onSafariExtensionUpdate(message)
        // Verify dispatch callback route was used.
        let lastBody = mockWebView.lastBody ?? ""
        XCTAssertTrue(
            lastBody.contains("__dispatchCallback"),
            "Must push via dispatchCallback invoke when bridge is attached"
        )
        let dispatchedMethod = mockWebView.lastArguments["method"] as? String
        XCTAssertEqual(
            dispatchedMethod,
            "SettingsCallbackService.OnSafariExtensionUpdate",
            "dispatchCallback must carry the fully-qualified callback method name"
        )
    }

    /// The Sciter→WKWebView migration cutover removed the Sciter-host
    /// fallback: with a nil bridge the callback is dropped (logged) and a
    /// default `EmptyValue` response is returned, never a dispatch.
    func testRegenerated_SettingsCallbackService_BridgeNil_ReturnsDefaultResponseWithoutDispatch() {
        let callback = SettingsCallbackService()
        XCTAssertNil(callback.bridge, "Pre-condition: bridge must be nil")

        let message = SafariExtensionUpdate()
        let result = callback.onSafariExtensionUpdate(message)
        XCTAssertEqual(result, EmptyValue(), "Nil-bridge path must return a default EmptyValue")
    }
}

// MARK: - Test doubles

/// ThemeService stub for request routing checks.
private final class StubThemeService: ThemeService, Service, ThemeServiceProtocol {
    func getEffectiveTheme(
        _ message: EmptyValue,
        _ promise: @escaping (EffectiveThemeValue) -> Void
    ) {
        var value = EffectiveThemeValue()
        // Use non-zero enum value so proto reply is not empty.
        value.value = .dark
        promise(value)
    }
}

/// Capturing mock for callback-dispatch verification.
private final class CapturingMockWebView: WebViewAsyncInvoking {
    var lastBody: String?
    var lastArguments: [String: Any] = [:]

    func invoke(
        body: String,
        arguments: [String: Any],
        completion: ((Result<Any, Error>) -> Void)?
    ) {
        lastBody = body
        lastArguments = arguments
        completion?(.success(0))
    }
}
