// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

// WKWebView-only callback bridge.

// MARK: `toSciter` / WKWebView service implementation

/// Service handles settings lists
public class TrayCallbackService: WebViewCallbackBridge
{
	/// On tray window open
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onTrayWindowVisibilityChange (_ message: BoolValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "TrayCallbackService.OnTrayWindowVisibilityChange",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("TrayCallbackService.OnTrayWindowVisibilityChange: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("TrayCallbackService.OnTrayWindowVisibilityChange: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when the application detects changes in a LoginItem service
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onLoginItemStateChange (_ message: BoolValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "TrayCallbackService.OnLoginItemStateChange",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("TrayCallbackService.OnLoginItemStateChange: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("TrayCallbackService.OnLoginItemStateChange: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when swift resolve if new version is available
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onApplicationVersionStatusResolved (_ message: BoolValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "TrayCallbackService.OnApplicationVersionStatusResolved",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("TrayCallbackService.OnApplicationVersionStatusResolved: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("TrayCallbackService.OnApplicationVersionStatusResolved: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when swift resolve filters current state
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onFilterStatusResolved (_ message: FiltersStatus) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "TrayCallbackService.OnFilterStatusResolved",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("TrayCallbackService.OnFilterStatusResolved: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("TrayCallbackService.OnFilterStatusResolved: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when one of extensions updated
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onSafariExtensionUpdate (_ message: SafariExtensionUpdate) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "TrayCallbackService.OnSafariExtensionUpdate",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("TrayCallbackService.OnSafariExtensionUpdate: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("TrayCallbackService.OnSafariExtensionUpdate: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when license state updated. Tray-scoped: carries only the fields the tray
	/// reads
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onLicenseUpdate (_ message: TrayLicenseOrError) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "TrayCallbackService.OnLicenseUpdate",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("TrayCallbackService.OnLicenseUpdate: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("TrayCallbackService.OnLicenseUpdate: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when effective theme changed
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onEffectiveThemeChanged (_ message: EffectiveThemeValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "TrayCallbackService.OnEffectiveThemeChanged",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("TrayCallbackService.OnEffectiveThemeChanged: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("TrayCallbackService.OnEffectiveThemeChanged: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when tray should open specific page
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onTrayPageRequested (_ message: StringValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "TrayCallbackService.OnTrayPageRequested",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("TrayCallbackService.OnTrayPageRequested: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("TrayCallbackService.OnTrayPageRequested: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
}
