/// This code was generated automatically by proto-parser tool version 1

import SciterSwift

// MARK: `toSciter` service implementation

/// Service handles settings lists
public class TrayCallbackService: SwiftBridge
{
	/// On tray window open
	@discardableResult public func onTrayWindowVisibilityChange (_ message: BoolValue) -> EmptyValue {
		return self.sciterCall(message, function: "TrayCallbackService.OnTrayWindowVisibilityChange")
	}
	/// Fires when the application detects changes in a LoginItem service
	@discardableResult public func onLoginItemStateChange (_ message: BoolValue) -> EmptyValue {
		return self.sciterCall(message, function: "TrayCallbackService.OnLoginItemStateChange")
	}
	/// Fires when swift resolve if new version is available
	@discardableResult public func onApplicationVersionStatusResolved (_ message: BoolValue) -> EmptyValue {
		return self.sciterCall(message, function: "TrayCallbackService.OnApplicationVersionStatusResolved")
	}
	/// Fires when swift resolve filters current state
	@discardableResult public func onFilterStatusResolved (_ message: FiltersStatus) -> EmptyValue {
		return self.sciterCall(message, function: "TrayCallbackService.OnFilterStatusResolved")
	}
	/// Fires when one of extensions updated
	@discardableResult public func onSafariExtensionUpdate (_ message: SafariExtensionUpdate) -> EmptyValue {
		return self.sciterCall(message, function: "TrayCallbackService.OnSafariExtensionUpdate")
	}
	/// Fires when license state updated. Tray-scoped: carries only the fields the tray
	/// reads
	@discardableResult public func onLicenseUpdate (_ message: TrayLicenseOrError) -> EmptyValue {
		return self.sciterCall(message, function: "TrayCallbackService.OnLicenseUpdate")
	}
	/// Fires when effective theme changed
	@discardableResult public func onEffectiveThemeChanged (_ message: EffectiveThemeValue) -> EmptyValue {
		return self.sciterCall(message, function: "TrayCallbackService.OnEffectiveThemeChanged")
	}
	/// Fires when tray should open specific page
	@discardableResult public func onTrayPageRequested (_ message: StringValue) -> EmptyValue {
		return self.sciterCall(message, function: "TrayCallbackService.OnTrayPageRequested")
	}
}
