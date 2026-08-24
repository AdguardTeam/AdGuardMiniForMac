// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

// WKWebView-only callback bridge.

// MARK: `toSciter` / WKWebView service implementation

/// Service handles account updates
public class AccountCallbackService: WebViewCallbackBridge
{
	/// Fires when license state updated
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onLicenseUpdate (_ message: LicenseOrError) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "AccountCallbackService.OnLicenseUpdate",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("AccountCallbackService.OnLicenseUpdate: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("AccountCallbackService.OnLicenseUpdate: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
}
