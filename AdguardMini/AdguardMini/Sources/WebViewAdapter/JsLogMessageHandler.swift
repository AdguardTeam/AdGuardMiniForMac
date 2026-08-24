// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  JsLogMessageHandler.swift
//  AdguardMini
//

import Foundation
import WebKit
import os
import ProtoSchema // ScriptMessageHandling test seam (same module).

/// Handles JS log posts.
final class JsLogMessageHandler: NSObject, WKScriptMessageHandler {
    private enum Constants {
        static let messageBodyLevelKey = "level"
        static let messageBodyMessageKey = "message"
        static let defaultLevel = "info"
        /// Levels the TS side emits (`logBridge.ts`); anything else falls
        /// back to `defaultLevel`.
        static let knownLevels: Set<String> = ["info", "dbg", "warn", "error"]
        /// Cap for forwarded log text, so a single oversized `postMessage`
        /// cannot degrade log performance/readability.
        static let maxMessageLength = 4096
        /// Token bucket: 60 posts per 10 s window = 6/s.
        static let capacity = 60.0
        static let refillPerSecond = 6.0
    }

    /// Owning module for log prefix.
    private let module: ModuleId

    private let rateLimiter: TokenBucketLimiter

    /// Logging seam for tests and production.
    private let route: (String, String) -> Void

    /// Logger.
    private let logger = Logger(
        subsystem: Subsystem.mainApp.name,
        category: "JsLogMessageHandler"
    )

    /// Creates handler.
    init(
        module: ModuleId,
        rateLimiter: TokenBucketLimiter? = nil,
        route: ((String, String) -> Void)? = nil
    ) {
        self.module = module
        self.rateLimiter = rateLimiter ?? TokenBucketLimiter(
            capacity: Constants.capacity,
            refillPerSecond: Constants.refillPerSecond
        )
        if let route {
            self.route = route
        } else {
            let logger = Logger(
                subsystem: Subsystem.mainApp.name,
                category: "JsLogMessageHandler"
            )
            self.route = { tag, text in
                // Log content originates from the (remotely updatable) page
                logger.error("\(tag, privacy: .public): \(text, privacy: .private)")
            }
        }
        super.init()
    }

    /// Truncates an arbitrary JS log payload to the configured cap.
    private static func truncate(_ value: String) -> String {
        String(value.prefix(Constants.maxMessageLength))
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        handle(message: message)
    }

    /// Handles message via test seam.
    func handle(message: ScriptMessageHandling) {
        // Support both dictionary payloads and plain-string messages.
        let level: String
        let text: String
        switch message.body {
        case let body as [String: Any]:
            let rawLevel = (body[Constants.messageBodyLevelKey] as? String) ?? ""
            // Allowlist the level so a malformed/abused page cannot pollute
            level = Constants.knownLevels.contains(rawLevel) ? rawLevel : Constants.defaultLevel
            if let msg = body[Constants.messageBodyMessageKey] as? String {
                text = Self.truncate(msg)
            } else {
                text = Self.truncate(String(describing: body[Constants.messageBodyMessageKey] ?? ""))
            }
        case let body as String:
            level = Constants.defaultLevel
            text = Self.truncate(body)
        default:
            level = Constants.defaultLevel
            text = Self.truncate(String(describing: message.body))
        }

        // Route to logger stream.
        let tag = "[JS:\(module.rawValue)] \(level.uppercased())"
        switch rateLimiter.tryConsume() {
        case .allowed:
            route(tag, text)
        case .limited(let shouldLog):
            if shouldLog {
                logger.error("jsLog: rate limited — dropping log posts")
            }
        }
    }
}
