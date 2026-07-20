/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Shared service for cross-module system and navigation actions
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `SystemService.ServiceType` IN SEPARATE SOURCE FILE
public protocol SystemServiceProtocol
{
	/// Request open settings page
	func requestOpenSettingsPage (
						_ message: StringValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Open login items settings
	func openLoginItemsSettings (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `SystemService.ServiceType`

/// Shared service for cross-module system and navigation actions
open class SystemService: SciterBridge
{
	public override var serviceName: String { "SystemService" }
    public typealias ServiceType = SystemService & Service & SystemServiceProtocol

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

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError()
	}
}