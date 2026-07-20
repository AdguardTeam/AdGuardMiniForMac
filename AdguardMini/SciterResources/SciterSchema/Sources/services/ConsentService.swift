/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Shared service for telemetry and user consent across UI modules
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `ConsentService.ServiceType` IN SEPARATE SOURCE FILE
public protocol ConsentServiceProtocol
{
	/// Update allow telemetry
	func updateAllowTelemetry (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update consent agreement
	func updateConsent (
						_ message: UserConsent,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `ConsentService.ServiceType`

/// Shared service for telemetry and user consent across UI modules
open class ConsentService: SciterBridge
{
	public override var serviceName: String { "ConsentService" }
    public typealias ServiceType = ConsentService & Service & ConsentServiceProtocol

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

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError()
	}
}