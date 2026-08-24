// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

// WKWebView-only callback bridge.

// MARK: `toSciter` / WKWebView service implementation

/// Service handles filters lists
public class FiltersCallbackService: WebViewCallbackBridge
{
	/// Fires when filters list updated
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onFiltersUpdate (_ message: EmptyValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "FiltersCallbackService.OnFiltersUpdate",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("FiltersCallbackService.OnFiltersUpdate: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("FiltersCallbackService.OnFiltersUpdate: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when filters index updated
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onFiltersIndexUpdate (_ message: FiltersIndex) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "FiltersCallbackService.OnFiltersIndexUpdate",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("FiltersCallbackService.OnFiltersIndexUpdate: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("FiltersCallbackService.OnFiltersIndexUpdate: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when user asked to subscribe on custom filter
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onCustomFiltersSubscribe (_ message: StringValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "FiltersCallbackService.OnCustomFiltersSubscribe",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("FiltersCallbackService.OnCustomFiltersSubscribe: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("FiltersCallbackService.OnCustomFiltersSubscribe: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
}
