// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  RpcTimeoutAlertMessageHandler.swift
//  AdguardMini
//

import Foundation
import WebKit
import os
import ProtoSchema // ScriptMessageHandling test seam (same module).

/// Handles recurring RPC timeout alerts.
final class RpcTimeoutAlertMessageHandler: NSObject, WKScriptMessageHandler {
    private enum Constants {
        static let messageBodyCountKey = "count"
        /// Upper sanity bound.
        static let maxPlausibleCount = 100
        /// Minimum alert interval.
        static let alertMinIntervalSeconds: TimeInterval = 30
        /// Rate limiter config.
        static let capacity = 60.0
        static let refillPerSecond = 6.0
    }

    private let presenter: any WKWebViewFailurePresenting
    private let rateLimiter: TokenBucketLimiter
    private let now: () -> Date
    private var lastAlertAt: Date?
    private let logger = Logger(
        subsystem: Subsystem.mainApp.name,
        category: "RpcTimeoutAlertMessageHandler"
    )

    init(
        presenter: any WKWebViewFailurePresenting,
        rateLimiter: TokenBucketLimiter? = nil,
        now: @escaping () -> Date = Date.init
    ) {
        self.presenter = presenter
        self.rateLimiter = rateLimiter ?? TokenBucketLimiter(
            capacity: Constants.capacity,
            refillPerSecond: Constants.refillPerSecond
        )
        self.now = now
        super.init()
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        handle(message: message)
    }

    /// Handles message via test seam.
    func handle(message: ScriptMessageHandling) {
        // Accept only plausible positive timeout counts.
        guard let body = message.body as? [String: Any],
              let count = Self.coerceCount(body[Constants.messageBodyCountKey]),
              count > 0,
              count <= Constants.maxPlausibleCount else {
            logger.error(
                "rpcTimeoutAlert: malformed count \(String(describing: message.body), privacy: .public)"
            )
            return
        }

        switch rateLimiter.tryConsume() {
        case .allowed:
            break
        case .limited(let shouldLog):
            if shouldLog {
                logger.error("rpcTimeoutAlert: rate limited — dropping")
            }
            return
        }

        let current = now()
        // Throttle repeated alerts within a short interval.
        if let last = lastAlertAt,
           current.timeIntervalSince(last) < Constants.alertMinIntervalSeconds {
            // Within-window throttling is an expected occurrence, not an error
            // (a misbehaving page could otherwise sustain error-level log spam).
            logger.debug("rpcTimeoutAlert: alert throttled (recent alert)")
            return
        }
        lastAlertAt = current

        logger.error("rpcTimeoutAlert: count=\(count, privacy: .public)")
        Task { @MainActor in
            await presenter.handleRecurringRpcTimeout()
        }
    }

    /// Coerces count value to Int.
    private static func coerceCount(_ value: Any?) -> Int? {
        switch value {
        case let intValue as Int:
            return intValue
        case let number as NSNumber:
            let doubleValue = number.doubleValue
            guard doubleValue.rounded() == doubleValue else { return nil }
            return Int(doubleValue)
        default:
            return nil
        }
    }
}
