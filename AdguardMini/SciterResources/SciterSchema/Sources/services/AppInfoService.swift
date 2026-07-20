/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Service handles about app information
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `AppInfoService.ServiceType` IN SEPARATE SOURCE FILE
public protocol AppInfoServiceProtocol
{
	/// Get About app info
	func getAbout (
						_ message: EmptyValue,
						_ promise: @escaping (AppInfo) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `AppInfoService.ServiceType`

/// Service handles about app information
open class AppInfoService: SciterBridge
{
	public override var serviceName: String { "AppInfoService" }
    public typealias ServiceType = AppInfoService & Service & AppInfoServiceProtocol

	/// Wrapper for `GetAbout`
	@objc func GetAbout(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: AppInfo.self,
			method: cast.getAbout(_:_:),
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