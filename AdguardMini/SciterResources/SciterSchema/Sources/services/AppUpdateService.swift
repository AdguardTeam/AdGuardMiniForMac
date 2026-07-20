/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Shared service for application version checks and update requests
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `AppUpdateService.ServiceType` IN SEPARATE SOURCE FILE
public protocol AppUpdateServiceProtocol
{
	/// Fires an event for Swift to check the application version; result will be
	/// dispatched by TrayCallbackService.OnApplicationVersionStatusResolved
	func checkApplicationVersion (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Request to update application
	func requestApplicationUpdate (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `AppUpdateService.ServiceType`

/// Shared service for application version checks and update requests
open class AppUpdateService: SciterBridge
{
	public override var serviceName: String { "AppUpdateService" }
    public typealias ServiceType = AppUpdateService & Service & AppUpdateServiceProtocol

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

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError()
	}
}