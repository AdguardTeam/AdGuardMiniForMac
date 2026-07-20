/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Tray-window-only service for tray settings and statistics
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `TraySettingsService.ServiceType` IN SEPARATE SOURCE FILE
public protocol TraySettingsServiceProtocol
{
	/// Get tray-specific settings
	func getTraySettings (
						_ message: EmptyValue,
						_ promise: @escaping (GlobalSettings) -> Void) -> Void
	/// Update tray-specific settings
	func updateTraySettings (
						_ message: GlobalSettings,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get blocking statistics
	func getStatistics (
						_ message: StatisticsRequest,
						_ promise: @escaping (StatisticsResponse) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `TraySettingsService.ServiceType`

/// Tray-window-only service for tray settings and statistics
open class TraySettingsService: SciterBridge
{
	public override var serviceName: String { "TraySettingsService" }
    public typealias ServiceType = TraySettingsService & Service & TraySettingsServiceProtocol

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

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError()
	}
}