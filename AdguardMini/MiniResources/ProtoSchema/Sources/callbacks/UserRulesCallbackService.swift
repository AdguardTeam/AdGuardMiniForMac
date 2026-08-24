// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

// WKWebView-only callback bridge.

// MARK: `toSciter` / WKWebView service implementation

/// Service handles settings lists
public class UserRulesCallbackService: WebViewCallbackBridge
{
	/// Fires when user rules were updated through assistant
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onUserFilterChange (_ message: UserRulesCallbackState) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "UserRulesCallbackService.onUserFilterChange",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("UserRulesCallbackService.onUserFilterChange: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("UserRulesCallbackService.onUserFilterChange: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when the user-rules editor window was closed
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onUserRulesWindowClosed (_ message: EmptyValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "UserRulesCallbackService.onUserRulesWindowClosed",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("UserRulesCallbackService.onUserRulesWindowClosed: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("UserRulesCallbackService.onUserRulesWindowClosed: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
}
