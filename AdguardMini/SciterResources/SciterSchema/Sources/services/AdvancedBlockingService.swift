/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Service handles Advanced blocking page
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `AdvancedBlockingService.ServiceType` IN SEPARATE SOURCE FILE
public protocol AdvancedBlockingServiceProtocol
{
	/// Get AdvancedBlocking settings
	func getAdvancedBlocking (
						_ message: EmptyValue,
						_ promise: @escaping (AdvancedBlocking) -> Void) -> Void
	/// Update AdvancedBlocking
	func updateAdvancedBlocking (
						_ message: AdvancedBlocking,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update RealTimeFiltersUpdate setting
	func updateRealTimeFiltersUpdate (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `AdvancedBlockingService.ServiceType`

/// Service handles Advanced blocking page
open class AdvancedBlockingService: SciterBridge
{
	public override var serviceName: String { "AdvancedBlockingService" }
    public typealias ServiceType = AdvancedBlockingService & Service & AdvancedBlockingServiceProtocol

	/// Wrapper for `GetAdvancedBlocking`
	@objc func GetAdvancedBlocking(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: AdvancedBlocking.self,
			method: cast.getAdvancedBlocking(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `UpdateAdvancedBlocking`
	@objc func UpdateAdvancedBlocking(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: AdvancedBlocking.self,
			outputType: EmptyValue.self,
			method: cast.updateAdvancedBlocking(_:_:),
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

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError()
	}
}