// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebViewBridgeBaseClassTests.swift
//  AdguardMiniTests
//

import XCTest
import ProtoSchema  // Public surface; no @testable import per AGENTS.md  III.2

final class WebViewBridgeBaseClassTests: XCTestCase {
    /// `WebViewBridge` should conform to `WKWebViewServiceHandler`.
    func testWebViewBridge_ConformsToWKWebViewServiceHandler() {
        let service = WebViewBridge()
        XCTAssertTrue(service is WKWebViewServiceHandler)
    }

    /// `WebViewCallbackBridge` should expose attach and bridge storage.
    func testWebViewCallbackBridge_ExposesAttachAndWeakBridge() {
        let callback = WebViewCallbackBridge()
        XCTAssertNil(callback.bridge)
        var mock: WKWebViewBridge? = WKWebViewBridge(webView: MockWebViewEvaluating())
        callback.attach(webViewBridge: mock!)
        XCTAssertNotNil(callback.bridge)
        // Assert the WEAK semantics: dropping the only strong reference to the
        // Bridge must deallocate it and nil out `callback.bridge`. This guards
        // Against a future accidental strong property.
        mock = nil
        XCTAssertNil(callback.bridge, "bridge must be a weak reference")
    }

    /// `BridgeLog` forwards every bridge log line to the sink the app
    /// installs from `AppLogConfig.setup()` (which routes into AML
    /// `Logger.shared`), preserving level + message. Guards the review fix:
    /// codegen-emitted service/callback log lines reach the app's logs.
    func testBridgeLog_ForwardsToConfiguredSink() {
        final class Box {
            var values: [(BridgeLogLevel, String)] = []
        }
        let box = Box()
        BridgeLog.sink = { level, message in
            box.values.append((level, message))
        }
        defer { BridgeLog.sink = nil }

        BridgeLog.error("boom")
        BridgeLog.warning("careful")
        BridgeLog.info("note")
        BridgeLog.debug("detail")

        XCTAssertEqual(box.values.map(\.0), [.error, .warning, .info, .debug])
        XCTAssertEqual(box.values.map(\.1), ["boom", "careful", "note", "detail"])
    }
}

/// `WebViewAsyncInvoking` mock for attach test.
private final class MockWebViewEvaluating: WebViewAsyncInvoking {
    func invoke(
        body: String,
        arguments: [String: Any],
        completion: ((Result<Any, Error>) -> Void)?
    ) { completion?(.success(0)) }
}
