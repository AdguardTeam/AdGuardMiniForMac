// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  JsLogMessageHandler.swift
//  AdguardMini
//

import Foundation
import WebKit
import AML
import ProtoSchema // ScriptMessageHandling test seam (same module).

/// JS log level posted by `window.log`; unknown values map to `.info`.
enum JsLogLevel: String {
    case info
    case dbg
    case warn
    case error

    static func from(_ raw: String) -> JsLogLevel {
        JsLogLevel(rawValue: raw) ?? .info
    }
}

/// Handles JS log posts, routing them through AML `Logger.shared`.
final class JsLogMessageHandler: NSObject, WKScriptMessageHandler {
    private enum Constants {
        static let messageBodyLevelKey = "level"
        static let messageBodyMessageKey = "message"
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

    /// Log sink: inlined by the host, injected by tests.
    private let route: (JsLogLevel, String, String) -> Void

    /// Creates a handler.
    init(
        module: ModuleId,
        rateLimiter: TokenBucketLimiter? = nil,
        route: @escaping (JsLogLevel, String, String) -> Void
    ) {
        self.module = module
        self.rateLimiter = rateLimiter ?? TokenBucketLimiter(
            capacity: Constants.capacity,
            refillPerSecond: Constants.refillPerSecond
        )
        self.route = route
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

    /// Handles a message via the test seam.
    func handle(message: ScriptMessageHandling) {
        // Support both dictionary payloads and plain-string messages.
        let level: JsLogLevel
        let text: String
        switch message.body {
        case let body as [String: Any]:
            let rawLevel = (body[Constants.messageBodyLevelKey] as? String) ?? ""
            level = JsLogLevel.from(rawLevel)
            if let msg = body[Constants.messageBodyMessageKey] as? String {
                text = Self.truncate(msg)
            } else {
                text = Self.truncate(String(describing: body[Constants.messageBodyMessageKey] ?? ""))
            }
        case let body as String:
            level = .info
            text = Self.truncate(body)
        default:
            level = .info
            text = Self.truncate(String(describing: message.body))
        }

        // Route to the log stream.
        let tag = "[JS:\(module.rawValue)] \(level.rawValue.uppercased())"
        switch rateLimiter.tryConsume() {
        case .allowed:
            self.route(level, tag, text)
        case .limited(let shouldLog):
            if shouldLog {
                LogWarn("jsLog: rate limited — dropping log posts")
            }
        }
    }
}
