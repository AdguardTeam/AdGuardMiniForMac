// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  JsRuntimeErrorMessageHandler.swift
//  AdguardMini
//

import Foundation
import WebKit
import os
import ProtoSchema // ScriptMessageHandling test seam (same module).

/// Handles JS runtime error posts.
final class JsRuntimeErrorMessageHandler: NSObject, WKScriptMessageHandler {
    private enum Constants {
        static let messageBodyMessageKey = "message"
        static let messageBodyStackKey = "stack"
        static let messageBodyKindKey = "kind"
        static let cspViolationKind = "csp-violation"
        static let rpcErrorKind = "rpc-error"
        static let defaultMessage = "Unknown JS runtime error"
        /// Minimum seconds between native alert surfaces (prevents a buggy
        /// or compromised page from holding the user in a modal alert loop).
        static let alertMinIntervalSeconds: TimeInterval = 30
        /// Cap for forwarded/logged message and stack lengths.
        static let maxPayloadLength = 4096
        /// Token bucket: 60 posts per 10 s window = 6/s.
        static let capacity = 60.0
        static let refillPerSecond = 6.0
        /// Separate bucket for non-fatal diagnostics (CSP violations, RPC
        /// Transport failures): same rate, but a burst of them cannot eat
        /// The tokens a genuine page error needs for its alert — and they
        /// Stay bounded themselves, so a spamming page cannot flood the
        /// Unified log and telemetry through the non-fatal surfaces.
        static let nonFatalCapacity = 60.0
        static let nonFatalRefillPerSecond = 6.0
    }

    private let presenter: any WKWebViewFailurePresenting
    private let rateLimiter: TokenBucketLimiter
    private let nonFatalRateLimiter: TokenBucketLimiter
    private let now: () -> TimeInterval
    private var lastAlertAt: TimeInterval?
    private let logger = Logger(
        subsystem: Subsystem.mainApp.name,
        category: "JsRuntimeErrorMessageHandler"
    )

    init(
        presenter: any WKWebViewFailurePresenting,
        rateLimiter: TokenBucketLimiter? = nil,
        nonFatalRateLimiter: TokenBucketLimiter? = nil,
        now: @escaping () -> TimeInterval = { ProcessInfo.processInfo.systemUptime }
    ) {
        self.presenter = presenter
        self.rateLimiter = rateLimiter ?? TokenBucketLimiter(
            capacity: Constants.capacity,
            refillPerSecond: Constants.refillPerSecond
        )
        self.nonFatalRateLimiter = nonFatalRateLimiter ?? TokenBucketLimiter(
            capacity: Constants.nonFatalCapacity,
            refillPerSecond: Constants.nonFatalRefillPerSecond
        )
        self.now = now
        super.init()
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        // Alerts originate from the module page itself; ignore messages from
        // Any subframe (untrusted content) to prevent forged alert spam.
        guard message.frameInfo.isMainFrame else {
            logger.error("jsRuntimeError: ignoring message from non-main frame")
            return
        }
        handle(message: message)
    }

    /// Handles message via test seam.
    func handle(message: ScriptMessageHandling) {
        // Fall back to default text for malformed payloads.
        guard let body = message.body as? [String: Any] else {
            // Reject malformed (non-dictionary) bodies: drop + log only, so a
            // Plain String post cannot surface a native modal alert.
            logger.error(
                "jsRuntimeError: malformed body \(String(describing: type(of: message.body)), privacy: .public)"
            )
            return
        }
        let messageStr = (body[Constants.messageBodyMessageKey] as? String)
            ?? Constants.defaultMessage
        // Preserve stack when provided by the page runtime.
        let stack = body[Constants.messageBodyStackKey] as? String
        // Diagnostic class posted by the JS `policyViolationReporter` wiring:
        // `csp-violation` reports are non-fatal and must not raise an alert.
        let kind = body[Constants.messageBodyKindKey] as? String
        routeIfAllowed(message: messageStr, stack: stack, kind: kind)
    }

    /// Rate-limits and forwards error details.
    private func routeIfAllowed(message: String, stack: String?, kind: String?) {
        // Non-fatal diagnostics — CSP violations (e.g. a third-party
        // Animation library applying inline styles on macOS 12) and RPC
        // Transport failures (timeouts, native-side rejections) — are not
        // Page failures: telemetry + log only, no restart alert. They
        // Consume their own bucket, not the genuine-error one: a stuck
        // Native side rejects every pending RPC, and such a burst must not
        // Exhaust the tokens a genuine page error needs for its alert —
        // While the separate bucket still keeps a spamming page from
        // Flooding the unified log and telemetry.
        if kind == Constants.cspViolationKind || kind == Constants.rpcErrorKind {
            switch nonFatalRateLimiter.tryConsume() {
            case .allowed:
                break
            case .limited(let shouldLog):
                if shouldLog {
                    logger.error("jsRuntimeError: non-fatal post rate limited — dropping")
                }
                return
            }
            logMessage(message: message, stack: stack)
            if kind == Constants.cspViolationKind {
                routeCSPViolation(message: message, stack: stack)
            } else {
                routeRpcError(message: message, stack: stack)
            }
            return
        }

        switch rateLimiter.tryConsume() {
        case .allowed:
            break
        case .limited(let shouldLog):
            if shouldLog {
                logger.error("jsRuntimeError: rate limited — dropping")
            }
            return
        }

        // Clamp alerts to one per `alertMinIntervalSeconds` (defense-in-depth
        // Beyond the token bucket) so a render-loop throwing cannot produce a
        // Near-continuous modal alert loop with forged text.
        let current = now()
        if let last = lastAlertAt,
           current - last < Constants.alertMinIntervalSeconds {
            logger.debug("jsRuntimeError: alert throttled (recent alert)")
            return
        }
        lastAlertAt = current

        logMessage(message: message, stack: stack)
        route(message: message, stack: stack)
    }

    /// Logs a capped, private-redacted message and stack.
    private func logMessage(message: String, stack: String?) {
        // Message and stack originate from the remotely-updatable page; log
        // Them private-redacted and capped so unredacted user data / URLs
        // Cannot land in the unified log.
        let cappedMessage = String(message.prefix(Constants.maxPayloadLength))
        let cappedStack = stack.map { String($0.prefix(Constants.maxPayloadLength)) }
        if let cappedStack {
            logger.error(
                "jsRuntimeError: message=\(cappedMessage, privacy: .private) stack=\(cappedStack, privacy: .private)"
            )
        } else {
            logger.error("jsRuntimeError: message=\(cappedMessage, privacy: .private)")
        }
    }

    /// Forwards a non-fatal CSP violation to the presenter (telemetry-only).
    private func routeCSPViolation(message: String, stack: String?) {
        Task { @MainActor in
            await presenter.handleCSPViolation(message: message, stack: stack)
        }
    }

    /// Forwards a non-fatal RPC failure to the presenter (telemetry-only).
    private func routeRpcError(message: String, stack: String?) {
        Task { @MainActor in
            await presenter.handleRpcError(message: message, stack: stack)
        }
    }

    /// Forwards error to presenter.
    private func route(message: String, stack: String?) {
        Task { @MainActor in
            await presenter.handleJSRuntimeError(message: message, stack: stack)
        }
    }
}
