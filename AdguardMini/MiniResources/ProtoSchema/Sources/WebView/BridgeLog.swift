// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  BridgeLog.swift
//  ProtoSchema
//

import Foundation

/// Reserved-for-sink severity hint mirroring the project-wide
/// `LogDebug` / `LogInfo` / `LogWarn` / `LogError` levels. Kept as a small
/// ProtoSchema-local enum (rather than referencing AML's `LogLevel`) so the
/// package stays dependency-free. It is just a hint — `ProtoSchema` does not
/// log; the app's configured sink decides what to do with a message.
public enum BridgeLogLevel {
    case debug
    case info
    case warning
    case error
}

/// Single outbound diagnostics hook for the WKWebView bridge codegen.
///
/// `ProtoSchema` deliberately holds no logger. The generated service/callback
/// wire-format `catch` blocks (decode-before-impl, encode-after-impl, unknown
/// method, nil bridge) and the handcrafted `WKWebViewBridge` dispatcher run in
/// this package, where AML's `LogError`/`LogWarn` — and the app's logging
/// pipeline they feed — are not reachable. Those call sites invoke
/// ``BridgeLog`` instead; the messages only exist to be handed to the
/// configured ``BridgeLog/sink``.
///
/// The app installs ``BridgeLog/sink`` once at startup
/// (`AdguardMini/Sources/Core/AppLogConfig.swift`) to forward each message
/// into AML's `Logger.shared` (exactly like the `LogDebug`/`LogInfo`/
/// `LogWarn`/`LogError` helpers), so bridge diagnostics land in the app's log
/// file, OSLog, and last-error store — using the app's one existing logger.
/// When no sink is configured (unit tests, build tools) calls are no-ops.
public enum BridgeLog {
    /// The host's diagnostics callback; `nil` until the app installs it in
    /// `AppLogConfig.setup()` (which runs before any bridge exists). Bridge
    /// log calls can arrive from non-main contexts, so the closure must be
    /// thread-safe.
    public static var sink: ((BridgeLogLevel, String) -> Void)?

    public static func error(_ message: @autoclosure () -> String) {
        emit(.error, message())
    }

    public static func warning(_ message: @autoclosure () -> String) {
        emit(.warning, message())
    }

    public static func info(_ message: @autoclosure () -> String) {
        emit(.info, message())
    }

    public static func debug(_ message: @autoclosure () -> String) {
        emit(.debug, message())
    }

    private static func emit(_ level: BridgeLogLevel, _ message: String) {
        sink?(level, message)
    }
}
