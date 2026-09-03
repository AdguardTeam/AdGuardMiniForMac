// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewFailurePresenter.swift
//  AdguardMini
//

import Foundation
import AppKit
import os

/// Presents WKWebView failures.
protocol WKWebViewFailurePresenting: AnyObject {
    /// Handles a WKWebView load failure.
    func handleLoadFailure(module: String, error: Error) async

    /// Handles a non-recoverable JS runtime error.
    func handleJSRuntimeError(message: String, stack: String?) async

    /// Handles a non-fatal CSP violation (diagnostics only, no alert).
    func handleCSPViolation(message: String, stack: String?) async

    /// Handles a non-fatal RPC transport failure (diagnostics only, no alert).
    func handleRpcError(message: String, stack: String?) async

    /// Handles recurring RPC timeout alerts.
    func handleRecurringRpcTimeout() async
}

// MARK: - WKWebViewFailurePresenter

/// Live failure presenter with logging, telemetry, and restart flow.
final class WKWebViewFailurePresenter: WKWebViewFailurePresenting {
    private enum Constants {
        static let telemetryLoadFailureEventName = "wkwebview_load_failure"
        static let telemetryJSRuntimeErrorEventName = "wkwebview_js_runtime_error"
        static let telemetryCSPViolationEventName = "wkwebview_csp_violation"
        static let telemetryRpcErrorEventName = "wkwebview_rpc_error"
        static let telemetryRpcTimeoutEventName = "rpc_recurring_timeout"
    }

    private let logger = Logger(
        subsystem: Subsystem.mainApp.name,
        category: "WKWebViewFailurePresenter"
    )

    private let recordTelemetry: @Sendable (Telemetry.Event) async -> Void
    private let presentAlert: @MainActor @Sendable (AppAlert) async -> NSApplication.ModalResponse
    private let restartApp: @MainActor @Sendable () async -> Void

    init(
        recordTelemetry: @escaping @Sendable (Telemetry.Event) async -> Void,
        presentAlert: @escaping @MainActor @Sendable (AppAlert) async -> NSApplication.ModalResponse,
        restartApp: @escaping @MainActor @Sendable () async -> Void
    ) {
        self.recordTelemetry = recordTelemetry
        self.presentAlert = presentAlert
        self.restartApp = restartApp
    }

    @MainActor
    func handleLoadFailure(module: String, error: Error) async {
        logger.error(
            "WKWebView load failure: module=\(module, privacy: .public) error=\(error.localizedDescription, privacy: .public)"
        )
        await recordTelemetry(
            .customEvent(.init(
                name: Constants.telemetryLoadFailureEventName,
                refName: module,
                action: "loadFailure",
                label: error.localizedDescription
            ))
        )
        await presentAndMaybeRestart {
            await AppAlert.webViewLoadFailureRequest(
                moduleName: module,
                errorMessage: error.localizedDescription
            )
        }
    }

    @MainActor
    func handleJSRuntimeError(message: String, stack: String?) async {
        // Log stack details when available.
        if let stack {
            logger.error(
                "WKWebView JS runtime error: \(message, privacy: .public)\nstack: \(stack, privacy: .public)"
            )
        } else {
            logger.error("WKWebView JS runtime error: \(message, privacy: .public)")
        }
        await recordTelemetry(
            .customEvent(.init(
                name: Constants.telemetryJSRuntimeErrorEventName,
                refName: "webView",
                label: stack.map { "\(message)\n--- stack ---\n\($0)" } ?? message
            ))
        )
        await presentAndMaybeRestart {
            await AppAlert.webViewLoadFailureRequest(
                moduleName: "webView",
                errorMessage: message
            )
        }
    }

    @MainActor
    func handleCSPViolation(message: String, stack: String?) async {
        // Log stack details when available.
        if let stack {
            logger.error(
                "WKWebView CSP violation: \(message, privacy: .public)\nstack: \(stack, privacy: .public)"
            )
        } else {
            logger.error("WKWebView CSP violation: \(message, privacy: .public)")
        }
        await recordTelemetry(
            .customEvent(.init(
                name: Constants.telemetryCSPViolationEventName,
                refName: "webView",
                label: stack.map { "\(message)\n--- stack ---\n\($0)" } ?? message
            ))
        )
        // CSP violations are diagnostics (e.g. a third-party animation
        // Library applying inline styles on macOS 12) and are not load
        // Failures. No modal alert is presented.
    }

    @MainActor
    func handleRpcError(message: String, stack: String?) async {
        // Log stack details when available.
        if let stack {
            logger.error(
                "WKWebView RPC error: \(message, privacy: .public)\nstack: \(stack, privacy: .public)"
            )
        } else {
            logger.error("WKWebView RPC error: \(message, privacy: .public)")
        }
        await recordTelemetry(
            .customEvent(.init(
                name: Constants.telemetryRpcErrorEventName,
                refName: "webView",
                label: stack.map { "\(message)\n--- stack ---\n\($0)" } ?? message
            ))
        )
        // RPC transport failures (timeouts, native-side rejections) are
        // Routine and recoverable and are not load failures. No modal
        // Alert is presented.
    }

    @MainActor
    func handleRecurringRpcTimeout() async {
        logger.error("Recurring RPC timeout threshold crossed")
        await recordTelemetry(
            .customEvent(.init(
                name: Constants.telemetryRpcTimeoutEventName,
                refName: "webView",
                label: "thresholdCrossed"
            ))
        )
    }

    @MainActor
    private func presentAndMaybeRestart(
        _ alertFactory: @escaping @MainActor () async -> AppAlert
    ) async {
        let alert = await alertFactory()
        let response = await presentAlert(alert)
        // Restart action is bound to the second button.
        if response == .alertSecondButtonReturn {
            await restartApp()
        }
    }

    // MARK: - No-op factory

    /// Returns a no-op presenter.
    static let noOp: any WKWebViewFailurePresenting = NoOpFailurePresenter()
}

// MARK: - NoOpFailurePresenter

/// No-op presenter implementation.
final class NoOpFailurePresenter: WKWebViewFailurePresenting {
    func handleLoadFailure(module: String, error: Error) async {}
    func handleJSRuntimeError(message: String, stack: String?) async {}
    func handleCSPViolation(message: String, stack: String?) async {}
    func handleRpcError(message: String, stack: String?) async {}
    func handleRecurringRpcTimeout() async {}
}
