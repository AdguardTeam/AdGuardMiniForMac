/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Shared service for Safari extension status and preferences across UI modules
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `SafariExtensionsService.ServiceType` IN SEPARATE SOURCE FILE
public protocol SafariExtensionsServiceProtocol
{
	/// Get Safari extension status
	func getSafariExtensions (
						_ message: EmptyValue,
						_ promise: @escaping (SafariExtensions) -> Void) -> Void
	/// Open Safari preferences
	func openSafariExtensionPreferences (
						_ message: OptionalStringValue,
						_ promise: @escaping (OptionalError) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `SafariExtensionsService.ServiceType`

/// Shared service for Safari extension status and preferences across UI modules
open class SafariExtensionsService: SciterBridge
{
	public override var serviceName: String { "SafariExtensionsService" }
    public typealias ServiceType = SafariExtensionsService & Service & SafariExtensionsServiceProtocol

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

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError()
	}
}