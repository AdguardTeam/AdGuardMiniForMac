// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

// WKWebView-only callback bridge.

// MARK: `toSciter` / WKWebView service implementation

/// Service handles settings lists
public class SettingsCallbackService: WebViewCallbackBridge
{
	/// Fires when one of extensions updated
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onSafariExtensionUpdate (_ message: SafariExtensionUpdate) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "SettingsCallbackService.OnSafariExtensionUpdate",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("SettingsCallbackService.OnSafariExtensionUpdate: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("SettingsCallbackService.OnSafariExtensionUpdate: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when the application detects changes in a LoginItem service
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onLoginItemStateChange (_ message: BoolValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "SettingsCallbackService.OnLoginItemStateChange",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("SettingsCallbackService.OnLoginItemStateChange: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("SettingsCallbackService.OnLoginItemStateChange: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when import completed or need to confirm consent
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onImportStateChange (_ message: ImportStatus) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "SettingsCallbackService.OnImportStateChange",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("SettingsCallbackService.OnImportStateChange: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("SettingsCallbackService.OnImportStateChange: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when another hardware acceleration was imported or migrated
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onHardwareAccelerationChange (_ message: BoolValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "SettingsCallbackService.OnHardwareAccelerationChange",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("SettingsCallbackService.OnHardwareAccelerationChange: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("SettingsCallbackService.OnHardwareAccelerationChange: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when resolve if new version is available
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onApplicationVersionStatusResolved (_ message: BoolValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "SettingsCallbackService.OnApplicationVersionStatusResolved",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("SettingsCallbackService.OnApplicationVersionStatusResolved: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("SettingsCallbackService.OnApplicationVersionStatusResolved: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Window did become main callback
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onWindowDidBecomeMain (_ message: EmptyValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "SettingsCallbackService.OnWindowDidBecomeMain",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("SettingsCallbackService.OnWindowDidBecomeMain: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("SettingsCallbackService.OnWindowDidBecomeMain: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when app requests to show settings page
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onSettingsPageRequested (_ message: StringValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "SettingsCallbackService.OnSettingsPageRequested",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("SettingsCallbackService.OnSettingsPageRequested: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("SettingsCallbackService.OnSettingsPageRequested: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when effective theme changed
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onEffectiveThemeChanged (_ message: EffectiveThemeValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "SettingsCallbackService.OnEffectiveThemeChanged",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("SettingsCallbackService.OnEffectiveThemeChanged: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("SettingsCallbackService.OnEffectiveThemeChanged: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Settings window was requested to open from tray
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onSettingsWindowOpened (_ message: EmptyValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "SettingsCallbackService.OnSettingsWindowOpened",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("SettingsCallbackService.OnSettingsWindowOpened: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("SettingsCallbackService.OnSettingsWindowOpened: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
	/// Fires when URL filter state changed
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onURLFilterStateChanged (_ message: URLFilterState) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "SettingsCallbackService.OnURLFilterStateChanged",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("SettingsCallbackService.OnURLFilterStateChanged: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("SettingsCallbackService.OnURLFilterStateChanged: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
}
