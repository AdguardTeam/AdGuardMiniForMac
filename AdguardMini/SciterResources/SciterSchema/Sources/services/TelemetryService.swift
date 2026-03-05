/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Service that handles telemetry events
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `TelemetryService.ServiceType` IN SEPARATE SOURCE FILE
public protocol TelemetryServiceProtocol
{
	/// Record telemetry event
	func recordEvent (
						_ message: TelemetryEvent,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get active AB tests
	func getActiveABTests (
						_ message: EmptyValue,
						_ promise: @escaping (ActiveABTests) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `TelemetryService.ServiceType`

/// Service that handles telemetry events
open class TelemetryService: SciterBridge
{
	public override var serviceName: String { "TelemetryService" }
    public typealias ServiceType = TelemetryService & Service & TelemetryServiceProtocol

	/// Wrapper for `RecordEvent`
	@objc func RecordEvent(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: TelemetryEvent.self,
			outputType: EmptyValue.self,
			method: cast.recordEvent(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `GetActiveABTests`
	@objc func GetActiveABTests(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: ActiveABTests.self,
			method: cast.getActiveABTests(_:_:),
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