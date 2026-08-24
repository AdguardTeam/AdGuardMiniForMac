// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebViewBridge.swift
//  ProtoSchema
//

import Foundation

/// Service-side base class for generated services.
open class WebViewBridge: WKWebViewServiceHandler {
    /// Service registration name used by `WKWebViewBridge`.
    open var serviceName: String { "" }

    /// Public initializer for cross-module service implementations.
    public init() {}

    // `unavailable_function` is no longer needed: the default no-op resolves
    // Gracefully instead of fatal-erroring.
    public func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
        // BridgeLog takes a single string-interpolation literal; `+` string
        // Concatenation does not compile, so the Message is one literal kept
        // Under the 120-char line limit.
        BridgeLog.error(
            "WebViewBridge.handleRequest: base called for method \"\(method)\" — no override; replying empty"
        )
        promise(Data())
    }
}
