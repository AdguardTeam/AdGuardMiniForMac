// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebViewCallbackBridge.swift
//  ProtoSchema
//

import Foundation

/// Callback-side base class for generated callback bridges.
open class WebViewCallbackBridge: NSObject {
    /// WKWebView bridge attached via `attach(webViewBridge:)`.
    public private(set) weak var bridge: WKWebViewBridge?

    /// Attaches WKWebView bridge.
    public func attach(webViewBridge: WKWebViewBridge) {
        if let current = bridge, current !== webViewBridge {
            BridgeLog.info(
                "Replacing already-attached bridge; callbacks from the previous page are no longer delivered"
            )
        }
        self.bridge = webViewBridge
    }
}
