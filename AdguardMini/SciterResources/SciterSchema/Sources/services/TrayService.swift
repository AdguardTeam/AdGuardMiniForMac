/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Service that handles tray settings
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `TrayService.ServiceType` IN SEPARATE SOURCE FILE
public protocol TrayServiceProtocol
{
	/// Get tray settings
	func getTraySettings (
						_ message: EmptyValue,
						_ promise: @escaping (GlobalSettings) -> Void) -> Void
	/// Update tray settings
	func updateTraySettings (
						_ message: GlobalSettings,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get blocking statistics
	func getStatistics (
						_ message: StatisticsRequest,
						_ promise: @escaping (StatisticsResponse) -> Void) -> Void
	/// Request open settings page
	func requestOpenSettingsPage (
						_ message: StringValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get effective theme
	func getEffectiveTheme (
						_ message: EmptyValue,
						_ promise: @escaping (EffectiveThemeValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `TrayService.ServiceType`

/// Service that handles tray settings
open class TrayService: SciterBridge
{
	public override var serviceName: String { "TrayService" }
    public typealias ServiceType = TrayService & Service & TrayServiceProtocol

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

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError()
	}
}