// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  InterfaceRequestDenier.swift
//  AdguardMini
//

import Foundation
import WebKit
import AML

/// Logging seam for request denial.
protocol InterfaceRequestDenialLogging: AnyObject {
    /// Records one refusal mechanism.
    ///
    /// `StaticString` guarantees only compile-time literals reach the log, so
    /// Page-controlled values (dialog text, URLs) can never be persisted.
    func recordRefusal(_ entry: StaticString)
}

/// Production logger adapter.
final class LoggerInterfaceRequestDenialLog: InterfaceRequestDenialLogging {
    func recordRefusal(_ entry: StaticString) {
        // Not an app failure, but security refusals must stay auditable in
        // Exported logs: info keeps them without displacing the last-error
        // Store (only `LogError` reaches it).
        LogInfo(String(describing: entry))
    }
}

/// Denies interface window/dialog/file-picker requests.
final class InterfaceRequestDenier: NSObject, WKUIDelegate {
    private let logger: InterfaceRequestDenialLogging

    /// Creates a denier with injected logger.
    init(logger: InterfaceRequestDenialLogging) {
        self.logger = logger
        super.init()
    }

    /// Production convenience initializer.
    override convenience init() {
        self.init(logger: LoggerInterfaceRequestDenialLog())
    }

    // MARK: - Window creation

    /// Refuses window creation.
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        refuseWindowCreation()
    }

    /// Refuses window creation for tests and delegate path.
    ///
    /// The requested URL is deliberately not logged: it can embed tokens or
    /// PII, and the refusal mechanism alone is what diagnostics need.
    func refuseWindowCreation() -> WKWebView? {
        logger.recordRefusal("Refused window.create")
        return nil
    }

    // MARK: - Script dialogs

    /// Refuses JavaScript alert.
    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        refuseAlert(completionHandler: completionHandler)
    }

    /// Refuses alert for tests and delegate path.
    ///
    /// The alert text is deliberately not logged: it can embed user data,
    /// And the refusal mechanism alone is what diagnostics need.
    func refuseAlert(completionHandler: @escaping () -> Void) {
        logger.recordRefusal("Refused alert")
        completionHandler()
    }

    /// Refuses JavaScript confirm.
    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        refuseConfirm(completionHandler: completionHandler)
    }

    /// Refuses confirm for tests and delegate path.
    ///
    /// The confirm text is deliberately not logged: it can embed user data,
    /// And the refusal mechanism alone is what diagnostics need.
    func refuseConfirm(completionHandler: @escaping (Bool) -> Void) {
        logger.recordRefusal("Refused confirm")
        completionHandler(false)
    }

    /// Refuses JavaScript prompt.
    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        refusePrompt(completionHandler: completionHandler)
    }

    /// Refuses prompt for tests and delegate path.
    ///
    /// The prompt text is deliberately not logged: it can embed user data,
    /// And the refusal mechanism alone is what diagnostics need.
    func refusePrompt(completionHandler: @escaping (String?) -> Void) {
        logger.recordRefusal("Refused prompt")
        completionHandler(nil)
    }

    // MARK: - File picker

    /// Refuses open panel.
    func webView(
        _ webView: WKWebView,
        runOpenPanelWith parameters: WKOpenPanelParameters,
        initiatedByFrame frame: WKFrameInfo,
        // Required by WKUIDelegate contract.
        // swiftlint:disable:next discouraged_optional_collection
        completionHandler: @escaping ([URL]?) -> Void
    ) {
        refuseOpenPanel(completionHandler: completionHandler)
    }

    // Required by WKUIDelegate contract.
    // Optional-collection rule is disabled here.
    // swiftlint:disable discouraged_optional_collection
    /// Refuses open panel for tests and delegate path.
    func refuseOpenPanel(completionHandler: @escaping ([URL]?) -> Void) {
        logger.recordRefusal("Refused file picker (open panel)")
        completionHandler(nil)
    }
    // swiftlint:enable discouraged_optional_collection

    // MARK: - Permission requests

    /// Refuses camera/microphone capture (macOS 12+), so a compromised page
    /// cannot trigger the system permission prompt (WebKit's fallback when
    /// this hook is unimplemented would).
    ///
    /// Note: `requestDisplayCapturePermissionFor` / `requestGeolocationPermissionFor`
    /// / `runBeforeUnloadConfirmPanel` are iOS-only `WKUIDelegate` hooks and do
    /// not exist on macOS, so no macOS counterparts are needed here.
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        refuseMediaCapture(decisionHandler: decisionHandler)
    }

    /// Extracted refusal logic for media-capture requests (see `refuseAlert`):
    /// logs exactly one record and denies, so a page can never grant itself
    /// camera/microphone access or trigger the system permission prompt.
    func refuseMediaCapture(decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        logger.recordRefusal("Refused media capture request")
        decisionHandler(.deny)
    }
}
