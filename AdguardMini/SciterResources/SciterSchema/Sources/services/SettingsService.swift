/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Service that handles settings
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `SettingsService.ServiceType` IN SEPARATE SOURCE FILE
public protocol SettingsServiceProtocol
{
	/// Get Settings settings
	func getSettings (
						_ message: EmptyValue,
						_ promise: @escaping (Settings) -> Void) -> Void
	/// Update LaunchOnStartup setting
	func updateLaunchOnStartup (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update ShowInMenuBar setting
	func updateShowInMenuBar (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update HardwareAcceleration setting
	func updateHardwareAcceleration (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Force restart on hardware acceleration import
	func forceRestartOnHardwareAccelerationImport (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update DebugLogging setting
	func updateDebugLogging (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update quit reaction setting
	func updateQuitReaction (
						_ message: UpdateQuitReactionMessage,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update RealTimeFiltersUpdate setting
	func updateRealTimeFiltersUpdate (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update AutoFiltersUpdate setting
	func updateAutoFiltersUpdate (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Export Settings settings
	func exportSettings (
						_ message: Path,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Import Settings settings
	func importSettings (
						_ message: Path,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Confirm Settings import with consent
	func importSettingsConfirm (
						_ message: ImportSettingsConfirmation,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Reset Settings to default settings
	func resetSettings (
						_ message: EmptyValue,
						_ promise: @escaping (Settings) -> Void) -> Void
	/// Get Settings settings
	func getTraySettings (
						_ message: EmptyValue,
						_ promise: @escaping (GlobalSettings) -> Void) -> Void
	/// Update Settings settings
	func updateTraySettings (
						_ message: GlobalSettings,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get Safari extension status
	func getSafariExtensions (
						_ message: EmptyValue,
						_ promise: @escaping (SafariExtensions) -> Void) -> Void
	/// Get limit on the number of rules for content blockers
	func getContentBlockersRulesLimit (
						_ message: EmptyValue,
						_ promise: @escaping (Int32Value) -> Void) -> Void
	/// Open safati preferences
	func openSafariExtensionPreferences (
						_ message: OptionalStringValue,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Open login items settings
	func openLoginItemsSettings (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Export Logs archive
	func exportLogs (
						_ message: Path,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Fires event for swift for checking application version, result will be dispatch
	/// by TrayCallbackService.OnApplicationVersionStatusResolved
	func checkApplicationVersion (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Request to update application
	func requestApplicationUpdate (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update consent agreement
	func updateConsent (
						_ message: UserConsent,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Send message to Support
	func sendFeedbackMessage (
						_ message: SupportMessage,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Request open settings page
	func requestOpenSettingsPage (
						_ message: StringValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get user action last directory
	func getUserActionLastDirectory (
						_ message: EmptyValue,
						_ promise: @escaping (StringValue) -> Void) -> Void
	/// Update user action last directory
	func updateUserActionLastDirectory (
						_ message: StringValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get system language
	func getSystemLanguage (
						_ message: EmptyValue,
						_ promise: @escaping (StringValue) -> Void) -> Void
	/// Get effective theme
	func getEffectiveTheme (
						_ message: EmptyValue,
						_ promise: @escaping (EffectiveThemeValue) -> Void) -> Void
	/// Update allow telemetry
	func updateAllowTelemetry (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update theme setting
	func updateTheme (
						_ message: UpdateThemeMessage,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get blocking statistics
	func getStatistics (
						_ message: StatisticsRequest,
						_ promise: @escaping (StatisticsResponse) -> Void) -> Void
	/// Reset all statistics
	func resetStatistics (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update user rules editor window geometry
	func updateUserRulesEditorGeometry (
						_ message: WindowGeometry,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Updates Safari toolbar badge visibility
	func updateShowSafariToolbarBadge (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `SettingsService.ServiceType`

/// Service that handles settings
open class SettingsService: SciterBridge
{
	public override var serviceName: String { "SettingsService" }
    public typealias ServiceType = SettingsService & Service & SettingsServiceProtocol

	/// Wrapper for `GetSettings`
	@objc func GetSettings(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: Settings.self,
			method: cast.getSettings(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateLaunchOnStartup`
	@objc func UpdateLaunchOnStartup(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: BoolValue.self,
			outputType: EmptyValue.self,
			method: cast.updateLaunchOnStartup(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateShowInMenuBar`
	@objc func UpdateShowInMenuBar(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: BoolValue.self,
			outputType: EmptyValue.self,
			method: cast.updateShowInMenuBar(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateHardwareAcceleration`
	@objc func UpdateHardwareAcceleration(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: BoolValue.self,
			outputType: EmptyValue.self,
			method: cast.updateHardwareAcceleration(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `ForceRestartOnHardwareAccelerationImport`
	@objc func ForceRestartOnHardwareAccelerationImport(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EmptyValue.self,
			method: cast.forceRestartOnHardwareAccelerationImport(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateDebugLogging`
	@objc func UpdateDebugLogging(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: BoolValue.self,
			outputType: EmptyValue.self,
			method: cast.updateDebugLogging(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateQuitReaction`
	@objc func UpdateQuitReaction(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: UpdateQuitReactionMessage.self,
			outputType: EmptyValue.self,
			method: cast.updateQuitReaction(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateRealTimeFiltersUpdate`
	@objc func UpdateRealTimeFiltersUpdate(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: BoolValue.self,
			outputType: EmptyValue.self,
			method: cast.updateRealTimeFiltersUpdate(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateAutoFiltersUpdate`
	@objc func UpdateAutoFiltersUpdate(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: BoolValue.self,
			outputType: EmptyValue.self,
			method: cast.updateAutoFiltersUpdate(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `ExportSettings`
	@objc func ExportSettings(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: Path.self,
			outputType: OptionalError.self,
			method: cast.exportSettings(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `ImportSettings`
	@objc func ImportSettings(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: Path.self,
			outputType: EmptyValue.self,
			method: cast.importSettings(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `ImportSettingsConfirm`
	@objc func ImportSettingsConfirm(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: ImportSettingsConfirmation.self,
			outputType: EmptyValue.self,
			method: cast.importSettingsConfirm(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `ResetSettings`
	@objc func ResetSettings(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: Settings.self,
			method: cast.resetSettings(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `GetTraySettings`
	@objc func GetTraySettings(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: GlobalSettings.self,
			method: cast.getTraySettings(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateTraySettings`
	@objc func UpdateTraySettings(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: GlobalSettings.self,
			outputType: EmptyValue.self,
			method: cast.updateTraySettings(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `GetSafariExtensions`
	@objc func GetSafariExtensions(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: SafariExtensions.self,
			method: cast.getSafariExtensions(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `GetContentBlockersRulesLimit`
	@objc func GetContentBlockersRulesLimit(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: Int32Value.self,
			method: cast.getContentBlockersRulesLimit(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `OpenSafariExtensionPreferences`
	@objc func OpenSafariExtensionPreferences(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: OptionalStringValue.self,
			outputType: OptionalError.self,
			method: cast.openSafariExtensionPreferences(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `OpenLoginItemsSettings`
	@objc func OpenLoginItemsSettings(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EmptyValue.self,
			method: cast.openLoginItemsSettings(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `ExportLogs`
	@objc func ExportLogs(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: Path.self,
			outputType: OptionalError.self,
			method: cast.exportLogs(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `CheckApplicationVersion`
	@objc func CheckApplicationVersion(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EmptyValue.self,
			method: cast.checkApplicationVersion(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RequestApplicationUpdate`
	@objc func RequestApplicationUpdate(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EmptyValue.self,
			method: cast.requestApplicationUpdate(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateConsent`
	@objc func UpdateConsent(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: UserConsent.self,
			outputType: EmptyValue.self,
			method: cast.updateConsent(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `SendFeedbackMessage`
	@objc func SendFeedbackMessage(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: SupportMessage.self,
			outputType: OptionalError.self,
			method: cast.sendFeedbackMessage(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RequestOpenSettingsPage`
	@objc func RequestOpenSettingsPage(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: StringValue.self,
			outputType: EmptyValue.self,
			method: cast.requestOpenSettingsPage(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `GetUserActionLastDirectory`
	@objc func GetUserActionLastDirectory(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: StringValue.self,
			method: cast.getUserActionLastDirectory(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateUserActionLastDirectory`
	@objc func UpdateUserActionLastDirectory(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: StringValue.self,
			outputType: EmptyValue.self,
			method: cast.updateUserActionLastDirectory(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `GetSystemLanguage`
	@objc func GetSystemLanguage(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: StringValue.self,
			method: cast.getSystemLanguage(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `GetEffectiveTheme`
	@objc func GetEffectiveTheme(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EffectiveThemeValue.self,
			method: cast.getEffectiveTheme(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateAllowTelemetry`
	@objc func UpdateAllowTelemetry(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: BoolValue.self,
			outputType: EmptyValue.self,
			method: cast.updateAllowTelemetry(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateTheme`
	@objc func UpdateTheme(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: UpdateThemeMessage.self,
			outputType: EmptyValue.self,
			method: cast.updateTheme(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `GetStatistics`
	@objc func GetStatistics(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: StatisticsRequest.self,
			outputType: StatisticsResponse.self,
			method: cast.getStatistics(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `ResetStatistics`
	@objc func ResetStatistics(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EmptyValue.self,
			method: cast.resetStatistics(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateUserRulesEditorGeometry`
	@objc func UpdateUserRulesEditorGeometry(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: WindowGeometry.self,
			outputType: EmptyValue.self,
			method: cast.updateUserRulesEditorGeometry(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateShowSafariToolbarBadge`
	@objc func UpdateShowSafariToolbarBadge(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: BoolValue.self,
			outputType: EmptyValue.self,
			method: cast.updateShowSafariToolbarBadge(_:_:),
			message,
			promise
		)
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError()
	}
}