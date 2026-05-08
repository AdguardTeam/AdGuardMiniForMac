/// This code was generated automatically by proto-parser tool version 1

import SciterSwift

// MARK: `toSciter` service implementation

/// Service handles settings lists
public class SettingsCallbackService: SwiftBridge
{
	/// Fires when one of extensions updated
	@discardableResult public func onSafariExtensionUpdate (_ message: SafariExtensionUpdate) -> EmptyValue {
		return self.sciterCall(message, function: "SettingsCallbackService.OnSafariExtensionUpdate")
	}
	/// Fires when the application detects changes in a LoginItem service
	@discardableResult public func onLoginItemStateChange (_ message: BoolValue) -> EmptyValue {
		return self.sciterCall(message, function: "SettingsCallbackService.OnLoginItemStateChange")
	}
	/// Fires when import completed or need to confirm consent
	@discardableResult public func onImportStateChange (_ message: ImportStatus) -> EmptyValue {
		return self.sciterCall(message, function: "SettingsCallbackService.OnImportStateChange")
	}
	/// Fires when another hardware acceleration was imported or migrated
	@discardableResult public func onHardwareAccelerationChange (_ message: BoolValue) -> EmptyValue {
		return self.sciterCall(message, function: "SettingsCallbackService.OnHardwareAccelerationChange")
	}
	/// Fires when resolve if new version is available
	@discardableResult public func onApplicationVersionStatusResolved (_ message: BoolValue) -> EmptyValue {
		return self.sciterCall(message, function: "SettingsCallbackService.OnApplicationVersionStatusResolved")
	}
	/// Window did become main callback
	@discardableResult public func onWindowDidBecomeMain (_ message: EmptyValue) -> EmptyValue {
		return self.sciterCall(message, function: "SettingsCallbackService.OnWindowDidBecomeMain")
	}
	/// Fires when app requests to show settings page
	@discardableResult public func onSettingsPageRequested (_ message: StringValue) -> EmptyValue {
		return self.sciterCall(message, function: "SettingsCallbackService.OnSettingsPageRequested")
	}
	/// Fires when effective theme changed
	@discardableResult public func onEffectiveThemeChanged (_ message: EffectiveThemeValue) -> EmptyValue {
		return self.sciterCall(message, function: "SettingsCallbackService.OnEffectiveThemeChanged")
	}
	/// Settings window was requested to open from tray
	@discardableResult public func onSettingsWindowOpened (_ message: EmptyValue) -> EmptyValue {
		return self.sciterCall(message, function: "SettingsCallbackService.OnSettingsWindowOpened")
	}
}
