// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  GeneratedBridgeRoundTripTests.swift
//  AdguardMiniTests
//

import XCTest
import ProtoSchema  // Public surface; no @testable import per AGENTS.md  III.2
import SwiftProtobuf

/// Round-trip checks for regenerated service and callback bridges.
/// `@MainActor` because the code under test is main-actor isolated.
@MainActor
final class GeneratedBridgeRoundTripTests: XCTestCase {
    /// `ThemeService.handleRequest` should return valid serialized reply bytes.
    func testRegenerated_ThemeService_HandleRequest_RoundTripsEmptyValueRequest() throws {
        let service = StubThemeService()
        let exp = expectation(description: "handleRequest promise called")
        var roundTrippedValue: EffectiveThemeValue?
        // `nonisolated(unsafe)` because the stub replies synchronously. The promise never outlives this test method.
        nonisolated(unsafe) let promise: (Data) -> Void = { replyBytes in
            XCTAssertFalse(replyBytes.isEmpty, "Reply bytes must be non-empty for a successful RPC")
            roundTrippedValue = try? EffectiveThemeValue(serializedBytes: replyBytes)
            exp.fulfill()
        }
        service.handleRequest(
            method: "GetEffectiveTheme",
            bytes: try EmptyValue().serializedData(),
            promise: promise
        )
        wait(for: [exp], timeout: 1.0)
        // Assert the round-tripped VALUE, not just deserializability, so a
        // Mangled non-zero enum case would be caught (the stub returns `.dark`).
        let reply = try XCTUnwrap(roundTrippedValue, "Reply must deserialize into EffectiveThemeValue")
        XCTAssertEqual(reply.value, .dark, "Round-tripped theme value must be preserved")
    }

    /// `UserRulesService.handleRequest` should round-trip the import failure reply.
    func testRegenerated_UserRulesService_ImportUserRules_RoundTripsErrorReply() throws {
        let service = StubUserRulesService(importReply: .importError)
        XCTAssertEqual(
            try self.roundTripImport(service).result,
            .error(true),
            "Round-tripped import failure reply must be preserved"
        )
    }

    /// `UserRulesService.handleRequest` should round-trip the imported rules reply.
    func testRegenerated_UserRulesService_ImportUserRules_RoundTripsRulesReply() throws {
        let imported = UserRules(enabled: true, rules: [UserRule(rule: "||example.org^", enabled: true)])
        let service = StubUserRulesService(importReply: UserRulesOrError(userRules: imported))
        XCTAssertEqual(
            try self.roundTripImport(service).result,
            .userRules(imported),
            "Round-tripped imported rules must be preserved"
        )
    }

    /// `UserRulesService.handleRequest` should round-trip an empty but valid rules reply.
    func testRegenerated_UserRulesService_ImportUserRules_RoundTripsEmptyRulesReply() throws {
        let imported = UserRules(enabled: true, rules: [])
        let service = StubUserRulesService(importReply: UserRulesOrError(userRules: imported))
        XCTAssertEqual(
            try self.roundTripImport(service).result,
            .userRules(imported),
            "An empty but valid imported rule set must be preserved"
        )
    }

    /// Sends one import request through the generated dispatcher and returns its reply.
    private func roundTripImport(_ service: StubUserRulesService) throws -> UserRulesOrError {
        var request = Path()
        request.path = Constants.importRequestPath
        let exp = self.expectation(description: "handleRequest promise called")
        var roundTrippedValue: UserRulesOrError?
        // `nonisolated(unsafe)` because the stub replies synchronously. The promise never outlives this test method.
        nonisolated(unsafe) let promise: (Data) -> Void = { replyBytes in
            XCTAssertFalse(replyBytes.isEmpty, "Reply bytes must be non-empty for a dispatched import RPC")
            roundTrippedValue = try? UserRulesOrError(serializedBytes: replyBytes)
            exp.fulfill()
        }
        service.handleRequest(
            method: "ImportUserRules",
            bytes: try request.serializedData(),
            promise: promise
        )
        self.wait(for: [exp], timeout: 1.0)
        XCTAssertEqual(
            service.receivedImportPath,
            Constants.importRequestPath,
            "The dispatcher must decode the request Path"
        )
        return try XCTUnwrap(roundTrippedValue, "Reply must deserialize into UserRulesOrError")
    }

    /// Values the import round-trip checks send and expect.
    private enum Constants {
        static let importRequestPath = "/imports/user-rules.txt"
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

    /// With a nil bridge the callback is dropped (logged) and a default
    /// `EmptyValue` response is returned, never a dispatch.
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

/// UserRulesService stub for reply-routing checks.
private final class StubUserRulesService: UserRulesService, Service, UserRulesServiceProtocol {
    /// Path the last import request carried, so the request leg can be pinned.
    private(set) var receivedImportPath: String?

    /// Reply the import sends back.
    private let importReply: UserRulesOrError

    init(importReply: UserRulesOrError) {
        self.importReply = importReply
        super.init()
    }

    func getUserRules(
        _ message: EmptyValue,
        _ promise: sending @escaping (UserRules) -> Void
    ) {
        promise(UserRules())
    }

    func addUserRule(
        _ message: StringValue,
        _ promise: sending @escaping (OptionalError) -> Void
    ) {
        promise(OptionalError())
    }

    func updateUserRules(
        _ message: UserRules,
        _ promise: sending @escaping (OptionalError) -> Void
    ) {
        promise(OptionalError())
    }

    func exportUserRules(
        _ message: Path,
        _ promise: sending @escaping (OptionalError) -> Void
    ) {
        promise(OptionalError())
    }

    func importUserRules(
        _ message: Path,
        _ promise: sending @escaping (UserRulesOrError) -> Void
    ) {
        self.receivedImportPath = message.path
        promise(self.importReply)
    }

    func resetUserRules(
        _ message: EmptyValue,
        _ promise: sending @escaping (UserRules) -> Void
    ) {
        promise(UserRules())
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
