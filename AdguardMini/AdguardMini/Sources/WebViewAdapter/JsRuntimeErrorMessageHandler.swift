// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  JsRuntimeErrorMessageHandler.swift
//  AdguardMini
//

import Foundation
import WebKit
import AML
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
        /// Cap for the unknown-kind length, so a huge page-supplied kind cannot
        /// Force an unbounded string traversal on the main thread.
        static let maxUnknownKindLength = 128
        /// Token bucket: 60 posts per 10 s window = 6/s.
        static let capacity = 60.0
        static let refillPerSecond = 6.0
        /// Separate bucket for non-fatal diagnostics (CSP violations, RPC
        /// Transport failures): same rate, but a burst of them cannot eat
        /// The tokens a genuine page error needs for its alert — and they
        /// Stay bounded themselves, so a spamming page cannot flood the
        /// App log through the non-fatal surfaces.
        static let nonFatalCapacity = 60.0
        static let nonFatalRefillPerSecond = 6.0
    }

    private let presenter: any WKWebViewFailurePresenting
    private let rateLimiter: TokenBucketLimiter
    private let nonFatalRateLimiter: TokenBucketLimiter
    private let now: () -> TimeInterval
    private var lastAlertAt: TimeInterval?

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
            LogError("jsRuntimeError: ignoring message from non-main frame")
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
            LogError(
                "jsRuntimeError: malformed body \(String(describing: type(of: message.body)))"
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
        // Page failures: log only, no restart alert. They consume their
        // Own bucket, not the genuine-error one: a stuck native side rejects
        // Every pending RPC, and such a burst must not exhaust the tokens a
        // Genuine page error needs for its alert — while the separate bucket
        // Still keeps a spamming page from flooding the app log.
        if kind == Constants.cspViolationKind || kind == Constants.rpcErrorKind {
            switch nonFatalRateLimiter.tryConsume() {
            case .allowed:
                break
            case .limited(let shouldLog):
                if shouldLog {
                    LogDebug("jsRuntimeError: non-fatal post rate limited — dropping")
                }
                return
            }
            self.logNonFatal(kind: kind, stack: stack)
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
                LogDebug("jsRuntimeError: rate limited — dropping")
            }
            return
        }

        // Clamp alerts to one per `alertMinIntervalSeconds` (defense-in-depth
        // Beyond the token bucket) so a render-loop throwing cannot produce a
        // Near-continuous modal alert loop with forged text.
        let current = now()
        if let last = lastAlertAt,
           current - last < Constants.alertMinIntervalSeconds {
            LogDebug("jsRuntimeError: alert throttled (recent alert)")
            return
        }
        lastAlertAt = current

        self.logFatal(kind: kind, stack: stack)
        route(message: message, stack: stack)
    }

    private func logFatal(kind: String?, stack: String?) {
        LogError(self.logLine(kind: kind, stack: stack))
    }

    /// Info level so a routine diagnostic never displaces the support
    /// "Last error" (only `LogError` reaches the last-error store).
    private func logNonFatal(kind: String?, stack: String?) {
        LogInfo(self.logLine(kind: kind, stack: stack))
    }

    /// The page-controlled message and stack are never persisted: they come
    /// From the remotely-updatable page body and can embed URLs, tokens, or
    /// User data. The presenter still receives them for the user-facing alert.
    private func logLine(kind: String?, stack: String?) -> String {
        "jsRuntimeError: kind=\(Self.safeKind(kind)) stack present=\(stack == nil ? "no" : "yes")"
    }

    /// Normalizes the page-supplied kind so a compromised page cannot write
    /// arbitrary text to the log. Only the bounded length of an unknown kind
    /// is recorded, so same-length unknown kinds are indistinguishable.
    static func safeKind(_ kind: String?) -> String {
        switch kind {
        case Constants.cspViolationKind: return Constants.cspViolationKind
        case Constants.rpcErrorKind: return Constants.rpcErrorKind
        case .none: return "none"
        case let .some(unknown):
            let prefix = unknown.prefix(Constants.maxUnknownKindLength)
            let truncated = prefix.endIndex != unknown.endIndex
            return "unknown(\(prefix.count)\(truncated ? "+" : ""))"
        }
    }

    /// Forwards a non-fatal CSP violation to the presenter (log-only).
    private func routeCSPViolation(message: String, stack: String?) {
        Task { @MainActor in
            await presenter.handleCSPViolation(message: message, stack: stack)
        }
    }

    /// Forwards a non-fatal RPC failure to the presenter (log-only).
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
