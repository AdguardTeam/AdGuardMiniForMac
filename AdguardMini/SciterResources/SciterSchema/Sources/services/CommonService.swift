/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Service that handles shared functionality across modules
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `CommonService.ServiceType` IN SEPARATE SOURCE FILE
public protocol CommonServiceProtocol
{
	/// Get Safari extension status
	func getSafariExtensions (
						_ message: EmptyValue,
						_ promise: @escaping (SafariExtensions) -> Void) -> Void
	/// Fires event for checking application version
	func checkApplicationVersion (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update consent agreement
	func updateConsent (
						_ message: UserConsent,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `CommonService.ServiceType`

/// Service that handles shared functionality across modules
open class CommonService: SciterBridge
{
	public override var serviceName: String { "CommonService" }
    public typealias ServiceType = CommonService & Service & CommonServiceProtocol

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