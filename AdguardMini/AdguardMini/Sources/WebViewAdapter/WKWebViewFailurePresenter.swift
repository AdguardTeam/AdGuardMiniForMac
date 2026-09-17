// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewFailurePresenter.swift
//  AdguardMini
//

import Foundation
import AppKit
import AML

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

    /// Handles a WebUI bundle integrity failure: the bundle did not pass the
    /// code-signature check, so it is never loaded.
    func handleBundleIntegrityFailure() async
}

// MARK: - WKWebViewFailurePresenter

/// Live failure presenter with logging and restart flow.
final class WKWebViewFailurePresenter: WKWebViewFailurePresenting {
    private let presentAlert: @MainActor @Sendable (AppAlert) async -> NSApplication.ModalResponse
    private let restartApp: @MainActor @Sendable () async -> Void
    private let terminateApp: @MainActor @Sendable () async -> Void

    init(
        presentAlert: @escaping @MainActor @Sendable (AppAlert) async -> NSApplication.ModalResponse,
        restartApp: @escaping @MainActor @Sendable () async -> Void,
        terminateApp: @escaping @MainActor @Sendable () async -> Void
    ) {
        self.presentAlert = presentAlert
        self.restartApp = restartApp
        self.terminateApp = terminateApp
    }

    @MainActor
    func handleLoadFailure(module: String, error: Error) async {
        // Log safe identifiers only; the failure description can embed the
        // Failing URL or other session data, and the alert below shows the
        // Full detail to the user.
        let nsError = error as NSError
        LogError(
            "WKWebView load failure: module=\(module) "
                + "domain=\(nsError.domain) code=\(nsError.code)"
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
        // The kind-bearing diagnostic is already logged by `JsRuntimeErrorMessageHandler`;
        // Info here keeps the raw message/stack (which could leak page data) out
        // Of the log and avoids displacing that last-error entry.
        LogInfo("WKWebView JS runtime error presented (stack present: \(stack == nil ? "no" : "yes"))")
        await presentAndMaybeRestart {
            await AppAlert.webViewLoadFailureRequest(
                moduleName: "webView",
                errorMessage: message
            )
        }
    }

    @MainActor
    func handleCSPViolation(message: String, stack: String?) async {
        // No-op: `JsRuntimeErrorMessageHandler` already logged the diagnostic.
    }

    @MainActor
    func handleRpcError(message: String, stack: String?) async {
        // No-op: `JsRuntimeErrorMessageHandler` already logged the diagnostic.
    }

    @MainActor
    func handleRecurringRpcTimeout() async {
        // Info, not Error: routine diagnostics must not displace the support
        // "Last error" store. Only the JS-posted path logs its own Error record
        // (`RpcTimeoutAlertMessageHandler`); on the native bridge-timeout path
        // (`AppDelegate` → `RecurringRpcTimeoutMonitor`) this Info line is the
        // Intended record.
        LogInfo("Recurring RPC timeout threshold crossed")
    }

    @MainActor
    func handleBundleIntegrityFailure() async {
        LogError(
            "WebUI bundle integrity failure: the bundle does not match the app signature"
        )
        let alert = await AppAlert.webUIIntegrityFailureRequest()
        _ = await self.presentAlert(alert)
        await self.terminateApp()
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
    func handleBundleIntegrityFailure() async {}
}
