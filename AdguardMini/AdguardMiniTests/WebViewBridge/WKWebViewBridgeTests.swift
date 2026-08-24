// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewBridgeTests.swift
//  AdguardMiniTests
//

import XCTest
import WebKit
import ProtoSchema  // Bridge types (per finding #9 rev 3)

final class WKWebViewBridgeTests: XCTestCase {
    func testDispatch_RoutesByMethodName_ToRegisteredServiceHandler() {
        let bridge = WKWebViewBridge(webView: MockWebView())
        let service = MockThemeService()
        bridge.register(service: service, serviceName: "ThemeService")

        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 1,
            "method": "ThemeService.GetEffectiveTheme",
            "bytes": Data()
        ]))

        XCTAssertEqual(service.invokedGetEffectiveThemeCount, 1)
    }

    func testDispatch_NonMainFrameMessage_IsDropped() {
        let mock = MockWebView()
        let bridge = WKWebViewBridge(webView: mock)
        let service = MockThemeService()
        bridge.register(service: service, serviceName: "ThemeService")

        bridge.handle(message: MockScriptMessage(
            name: "rpc",
            body: [
                "id": 1,
                "method": "ThemeService.GetEffectiveTheme",
                "bytes": Data()
            ],
            isFromMainFrame: false
        ))

        XCTAssertEqual(service.invokedGetEffectiveThemeCount, 0,
                       "A subframe message must NOT enter the service implementation")
        XCTAssertNil(mock.lastInvocation,
                     "A subframe message must NOT resolve the RPC")
    }

    func testDispatch_RoundTripsBinaryBytes_ByteForByte() throws {
        let mockWebView = MockWebView()
        let bridge = WKWebViewBridge(webView: mockWebView)
        let echoService = MockEchoService()
        bridge.register(service: echoService, serviceName: "EchoService")

        let payload = Data([
            0x00, 0xFF, 0x7F, 0x80, 0x01, 0x02, 0x03, 0x04,
            0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFE
        ])
        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 7,
            "method": "EchoService.Echo",
            "bytes": payload
        ]))

        XCTAssertEqual(echoService.lastReceivedBytes, payload)
    }

    func testDispatch_AcceptsBytesAsNumberArray_BridgedFromUint8Array() throws {
        // JS `Uint8Array` may arrive as `[NSNumber]`.
        let mockWebView = MockWebView()
        let bridge = WKWebViewBridge(webView: mockWebView)
        let echoService = MockEchoService()
        bridge.register(service: echoService, serviceName: "EchoService")

        // Mirrors `rpc.postMessage` byte delivery.
        let bridgedBytes: [NSNumber] = [0, 255, 127, 128, 1, 254]
        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 3,
            "method": "EchoService.Echo",
            "bytes": bridgedBytes
        ]))

        XCTAssertEqual(
            echoService.lastReceivedBytes,
            Data([0x00, 0xFF, 0x7F, 0x80, 0x01, 0xFE])
        )
    }

    func testDispatch_AcceptsBytesAsDictionary_BridgedFromUint8Array() throws {
        // JS `Uint8Array` may arrive as indexed dictionary.
        let mockWebView = MockWebView()
        let bridge = WKWebViewBridge(webView: mockWebView)
        let echoService = MockEchoService()
        bridge.register(service: echoService, serviceName: "EchoService")

        // Mirrors indexed-byte dictionary form.
        let bridgedBytes: [String: NSNumber] = [
            "0": 10, "1": 20, "2": 101, "3": 110
        ]
        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 4,
            "method": "EchoService.Echo",
            "bytes": bridgedBytes
        ]))

        XCTAssertEqual(
            echoService.lastReceivedBytes,
            Data([10, 20, 101, 110])
        )
    }

    func testDispatch_AcceptsBytesAsDictionary_MultiDigitKeys_OrderedNumerically() throws {
        // Protobuf payloads routinely exceed 9 bytes, so the index-keyed
        // Dictionary form must be re-assembled in NUMERIC order. A lexicographic
        // Sort would corrupt any payload with index >= 10.
        let mockWebView = MockWebView()
        let bridge = WKWebViewBridge(webView: mockWebView)
        let echoService = MockEchoService()
        bridge.register(service: echoService, serviceName: "EchoService")

        // A full contiguous index run `0...10` (11 bytes) — a valid bridged
        // `Uint8Array` whose multi-digit key "10" verifies NUMERIC (not
        // Lexical) ordering: a lexicographic sort would place "10" right
        // After "1", producing a corrupted payload.
        let bridgedBytes: [String: NSNumber] = [
            "0": 1, "1": 2, "2": 3, "3": 4, "4": 5,
            "5": 6, "6": 7, "7": 8, "8": 9, "9": 10, "10": 11
        ]
        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 9,
            "method": "EchoService.Echo",
            "bytes": bridgedBytes
        ]))

        XCTAssertEqual(
            echoService.lastReceivedBytes,
            Data([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
            "dictionary keys must be ordered numerically, not lexically"
        )
    }

    // MARK: - Reply path

    func testReply_DeliversBytesAsNamedArgument_FixedBody_BinaryFidelity() {
        let mock = MockWebView()
        let bridge = WKWebViewBridge(webView: mock)
        let echo = MockEchoService()
        bridge.register(service: echo, serviceName: "EchoService")

        // Includes zero and high bytes; payload is base64 in arguments.
        let payload = Data([0x00, 0x01, 0x7F, 0x80, 0xFE, 0xFF])
        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 7,
            "method": "EchoService.Echo",
            "bytes": payload
        ]))

        let inv = try? XCTUnwrap(mock.lastInvocation).get()
        XCTAssertEqual(inv?.body, "window.__resolveRpc(id, bytes)")
        XCTAssertEqual(inv?.arguments["id"] as? Int, 7)
        XCTAssertEqual(inv?.arguments["bytes"] as? String, payload.base64EncodedString())
    }

    func testReplyError_DeliversEmptyBytesAsNamedArgument_SameFixedBody() {
        let mock = MockWebView()
        let bridge = WKWebViewBridge(webView: mock)

        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 99,
            "method": "UnknownService.UnknownMethod",
            "bytes": Data()
        ]))

        let inv = try? XCTUnwrap(mock.lastInvocation).get()
        XCTAssertEqual(inv?.body, "window.__resolveRpc(id, bytes)")
        XCTAssertEqual(inv?.arguments["id"] as? Int, 99)
        XCTAssertEqual(inv?.arguments["bytes"] as? String, "",
                       "The base64 of empty data is the empty string")
    }

    // MARK: - Callback-push path

    func testDispatchCallback_DeliversMethodAndBytesAsNamedArguments_FixedBody() {
        let mock = MockWebView()
        let bridge = WKWebViewBridge(webView: mock)

        bridge.dispatchCallback(
            method: "OnboardingCallbackService.OnEffectiveThemeChanged",
            data: Data([0x08, 0x01])
        )

        let inv = try? XCTUnwrap(mock.lastInvocation).get()
        XCTAssertEqual(inv?.body, "window.__dispatchCallback(method, bytes)")
        XCTAssertEqual(inv?.arguments["method"] as? String,
                       "OnboardingCallbackService.OnEffectiveThemeChanged")
        XCTAssertEqual(inv?.arguments["bytes"] as? String,
                       Data([0x08, 0x01]).base64EncodedString())
    }

    func testDispatchCallback_HostileMethodName_StaysInArguments_NoBoundaryCrossed() {
        // Method values must stay in arguments and not change body literal.
        let hostile: [String] = [
            "Onc'\"\\\"board",             // quotes + backslash
            "On\nboard\tService.X",        // control chars
            "On\u{2028}board.Svc.Y",       // line separator (U+2028)
            "</script><script>alert(1)</script>" // markup-like
        ]
        for name in hostile {
            let mock = MockWebView()
            let bridge = WKWebViewBridge(webView: mock)
            bridge.dispatchCallback(method: name, data: Data([0x01]))
            let inv = try? XCTUnwrap(mock.lastInvocation).get()
            XCTAssertEqual(inv?.body, "window.__dispatchCallback(method, bytes)",
                           "body constant MUST be identical regardless of method content")
            XCTAssertEqual(inv?.arguments["method"] as? String, name,
                           "method name MUST arrive byte-for-byte intact")
            XCTAssertEqual(inv?.arguments["bytes"] as? String,
                           Data([0x01]).base64EncodedString())
        }
    }

    // MARK: - Swift→TS push gating (page readiness)

    // `window.__dispatchCallback` is not installed until the module bundle
    // Executes (see Finding #1 — deferred visibility callback), so pushes
    // Arriving while the page loads must be buffered, never dispatched.
    func testDispatchCallback_BeforePageReady_IsBuffered_NotInvoked() {
        let mock = MockWebView()
        let bridge = WKWebViewBridge(webView: mock)

        bridge.beginLoad()
        bridge.dispatchCallback(
            method: "TrayCallbackService.OnLicenseUpdate",
            data: Data([0x01])
        )

        XCTAssertNil(mock.lastInvocation, "push must be buffered until markPageReady")
    }

    func testDispatchCallback_Buffered_FlushesOnMarkPageReady_WithMethodAndBytes() throws {
        let mock = MockWebView()
        let bridge = WKWebViewBridge(webView: mock)

        bridge.beginLoad()
        bridge.dispatchCallback(
            method: "TrayCallbackService.OnEffectiveThemeChanged",
            data: Data([0x08, 0x01])
        )
        XCTAssertNil(mock.lastInvocation, "precondition: buffered before markPageReady")

        bridge.markPageReady()

        let inv = try XCTUnwrap(mock.lastInvocation?.get())
        XCTAssertEqual(inv.body, "window.__dispatchCallback(method, bytes)")
        XCTAssertEqual(
            inv.arguments["method"] as? String,
            "TrayCallbackService.OnEffectiveThemeChanged"
        )
        XCTAssertEqual(
            inv.arguments["bytes"] as? String,
            Data([0x08, 0x01]).base64EncodedString()
        )
    }

    func testDispatchCallback_AfterPageReady_DispatchesImmediately() throws {
        let mock = MockWebView()
        let bridge = WKWebViewBridge(webView: mock)

        bridge.beginLoad()
        bridge.markPageReady()  // page finished navigation before the push arrives
        bridge.dispatchCallback(
            method: "TrayCallbackService.OnLicenseUpdate",
            data: Data([0x01])
        )

        let inv = try XCTUnwrap(mock.lastInvocation?.get())
        XCTAssertEqual(inv.body, "window.__dispatchCallback(method, bytes)")
        XCTAssertEqual(
            inv.arguments["method"] as? String,
            "TrayCallbackService.OnLicenseUpdate"
        )
    }

    func testDispatchCallback_BufferedPushes_FlushInFifoOrder() throws {
        let recorder = RecordingWebView()
        let bridge = WKWebViewBridge(webView: recorder)

        bridge.beginLoad()
        bridge.dispatchCallback(method: "A.First", data: Data([0x01]))
        bridge.dispatchCallback(method: "B.Second", data: Data([0x02]))
        bridge.markPageReady()

        let methods = recorder.invocations.compactMap {
            try? $0.get().arguments["method"] as? String
        }
        XCTAssertEqual(methods, ["A.First", "B.Second"], "buffered pushes must flush in FIFO order")
    }

    // MARK: - Fixed instruction bodies

    func testInstructionBodies_AreFixedConstants_NoRuntimeValuesEmbedded() {
        // Instructions must remain fixed literals.
        XCTAssertEqual(
            WKWebViewBridge.InstructionBodies.resolveRpcBody,
            "window.__resolveRpc(id, bytes)"
        )
        XCTAssertEqual(
            WKWebViewBridge.InstructionBodies.dispatchCallbackBody,
            "window.__dispatchCallback(method, bytes)"
        )
    }

    // MARK: - Schema method allowlist

    func testDispatch_DeclaredMethod_ReachesServiceHandler() {
        // Declared method should reach service handler.
        let bridge = WKWebViewBridge(webView: MockWebView())
        let service = MockThemeService()
        bridge.register(service: service, serviceName: "ThemeService")

        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 1,
            "method": "ThemeService.GetEffectiveTheme",
            "bytes": Data()
        ]))

        XCTAssertEqual(service.invokedGetEffectiveThemeCount, 1,
                       "A schema-declared method must reach the service handler")
    }

    func testDispatch_UndeclaredMethod_RejectedAtBridge_ServiceNotEntered_EmptyPayload() {
        // Undeclared method should be rejected with empty payload.
        let mock = MockWebView()
        let bridge = WKWebViewBridge(webView: mock)
        let service = MockThemeService()
        bridge.register(service: service, serviceName: "ThemeService")

        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 42,
            "method": "ThemeService.DefinitelyNotASchemaMethod",
            "bytes": Data()
        ]))

        XCTAssertEqual(service.invokedGetEffectiveThemeCount, 0,
                       "An undeclared method must NOT enter the service implementation")
        let inv = try? XCTUnwrap(mock.lastInvocation).get()
        XCTAssertEqual(inv?.body, "window.__resolveRpc(id, bytes)")
        XCTAssertEqual(inv?.arguments["id"] as? Int, 42)
        XCTAssertEqual(inv?.arguments["bytes"] as? String, "",
                       "An undeclared method must resolve with an empty payload")
    }

    func testDispatch_NonGeneratedService_AllowlistNotEnforced() {
        // Non-generated service should not be allowlist-restricted.
        let mock = MockWebView()
        let bridge = WKWebViewBridge(webView: mock)
        let echo = MockEchoService()
        bridge.register(service: echo, serviceName: "EchoService")

        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 9,
            "method": "EchoService.Echo",
            "bytes": Data([0x01, 0x02])
        ]))

        XCTAssertEqual(echo.lastReceivedBytes, Data([0x01, 0x02]),
                       "A non-generated service must be unaffected by the allowlist")
    }

    // MARK: - Per-module method restriction (spec FR-008)

    func testDispatch_RestrictedMethod_OutsideSubset_IsRejectedWithEmptyReply() {
        let mock = MockWebView()
        let bridge = WKWebViewBridge(webView: mock)
        let service = MockThemeService()
        bridge.register(service: service, serviceName: "MockService")
        bridge.restrict(service: "MockService", to: ["AllowedMethod"])

        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 5,
            "method": "MockService.DeniedMethod",
            "bytes": Data()
        ]))

        XCTAssertEqual(service.invokedGetEffectiveThemeCount, 0)
        let inv = try? XCTUnwrap(mock.lastInvocation).get()
        XCTAssertEqual(inv?.body, "window.__resolveRpc(id, bytes)")
        XCTAssertEqual(inv?.arguments["bytes"] as? String, "",
                       "Rejected method must settle with an empty payload")
    }

    func testDispatch_RestrictedMethod_InsideSubset_IsDispatched() {
        let mock = MockWebView()
        let bridge = WKWebViewBridge(webView: mock)
        let service = MockThemeService()
        bridge.register(service: service, serviceName: "MockService")
        bridge.restrict(service: "MockService", to: ["GetEffectiveTheme"])

        bridge.handle(message: MockScriptMessage(name: "rpc", body: [
            "id": 6,
            "method": "MockService.GetEffectiveTheme",
            "bytes": Data()
        ]))

        XCTAssertEqual(service.invokedGetEffectiveThemeCount, 1)
    }
}

// MARK: - Test doubles

/// Records latest structured invocation.
final class MockWebView: WebViewAsyncInvoking {
    struct Invocation { let body: String; let arguments: [String: Any] }
    private(set) var lastInvocation: Result<Invocation, Never>?

    func invoke(
        body: String,
        arguments: [String: Any],
        completion: ((Result<Any, Error>) -> Void)?
    ) {
        lastInvocation = .success(Invocation(body: body, arguments: arguments))
        completion?(.success(0)) // immediate response
    }
}

/// Records EVERY structured invocation in arrival order (unlike
/// `MockWebView`, which keeps only the last). Verifies the FIFO flush of
/// pushes buffered before `markPageReady()`.
private final class RecordingWebView: WebViewAsyncInvoking {
    private(set) var invocations: [Result<MockWebView.Invocation, Never>] = []

    func invoke(
        body: String,
        arguments: [String: Any],
        completion: ((Result<Any, Error>) -> Void)?
    ) {
        invocations.append(.success(MockWebView.Invocation(body: body, arguments: arguments)))
        completion?(.success(0))
    }
}

struct MockScriptMessage: ScriptMessageHandling {
    let name: String
    let body: Any
    /// Defaults to `true` (main frame) so existing call sites keep compiling;
    /// override with `false` to model a subframe post.
    var isFromMainFrame: Bool = true
}

final class MockThemeService: WKWebViewServiceHandler {
    var invokedGetEffectiveThemeCount = 0

    func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
        invokedGetEffectiveThemeCount += 1
        promise(bytes)
    }
}

final class MockEchoService: WKWebViewServiceHandler {
    var lastReceivedBytes: Data = Data()

    func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
        lastReceivedBytes = bytes
        promise(bytes)
    }
}
