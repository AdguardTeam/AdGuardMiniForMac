/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Service that handles client-platform communication
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `InternalService.ServiceType` IN SEPARATE SOURCE FILE
public protocol InternalServiceProtocol
{
	/// Opens settings window of Adguard window
	func openSettingsWindow (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Activates the Finder, and opens one window selecting the specified file
	func showInFinder (
						_ message: Path,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Opens report page in default browser
	func reportAnIssue (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `InternalService.ServiceType`

/// Service that handles client-platform communication
open class InternalService: SciterBridge
{
	public override var serviceName: String { "InternalService" }
    public typealias ServiceType = InternalService & Service & InternalServiceProtocol

	/// Wrapper for `OpenSettingsWindow`
	@objc func OpenSettingsWindow(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EmptyValue.self,
			method: cast.openSettingsWindow(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `ShowInFinder`
	@objc func ShowInFinder(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: Path.self,
			outputType: EmptyValue.self,
			method: cast.showInFinder(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `reportAnIssue`
	@objc func reportAnIssue(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EmptyValue.self,
			method: cast.reportAnIssue(_:_:),
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