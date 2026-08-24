// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  InterfaceRequestDenier.swift
//  AdguardMini
//

import Foundation
import WebKit
import os

/// Logging seam for request denial.
protocol InterfaceRequestDenialLogging: AnyObject {
    /// Records one refusal message.
    func recordRefusal(_ entry: String)
}

/// Production logger adapter.
final class LoggerInterfaceRequestDenialLog: InterfaceRequestDenialLogging {
    private enum Constants {
        static let subsystem = Subsystem.mainApp.name
        static let category = "InterfaceRequestDenier"
    }

    private let logger = Logger(
        subsystem: Constants.subsystem,
        category: Constants.category
    )

    func recordRefusal(_ entry: String) {
        // Refusals can embed arbitrary JS dialog text or URLs carrying
        // Sensitive data; keep them private-redacted in the unified log.
        logger.error("\(entry, privacy: .private)")
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
        let requested = navigationAction.request.url?.absoluteString ?? "<no url>"
        return refuseWindowCreation(requestedURL: requested)
    }

    /// Refuses window creation for tests and delegate path.
    func refuseWindowCreation(requestedURL: String) -> WKWebView? {
        logger.recordRefusal("Refused window.create: \(requestedURL)")
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
        refuseAlert(message: message, completionHandler: completionHandler)
    }

    /// Refuses alert for tests and delegate path.
    func refuseAlert(message: String, completionHandler: @escaping () -> Void) {
        logger.recordRefusal("Refused alert: \(message)")
        completionHandler()
    }

    /// Refuses JavaScript confirm.
    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        refuseConfirm(message: message, completionHandler: completionHandler)
    }

    /// Refuses confirm for tests and delegate path.
    func refuseConfirm(message: String, completionHandler: @escaping (Bool) -> Void) {
        logger.recordRefusal("Refused confirm: \(message)")
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
        refusePrompt(prompt: prompt, completionHandler: completionHandler)
    }

    /// Refuses prompt for tests and delegate path.
    func refusePrompt(prompt: String, completionHandler: @escaping (String?) -> Void) {
        logger.recordRefusal("Refused prompt: \(prompt)")
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
