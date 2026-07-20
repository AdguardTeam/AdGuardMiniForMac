/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Shared service for resolving the effective theme across UI modules
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `ThemeService.ServiceType` IN SEPARATE SOURCE FILE
public protocol ThemeServiceProtocol
{
	/// Get effective theme
	func getEffectiveTheme (
						_ message: EmptyValue,
						_ promise: @escaping (EffectiveThemeValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `ThemeService.ServiceType`

/// Shared service for resolving the effective theme across UI modules
open class ThemeService: SciterBridge
{
	public override var serviceName: String { "ThemeService" }
    public typealias ServiceType = ThemeService & Service & ThemeServiceProtocol

	/// Wrapper for `GetEffectiveTheme`
	@objc func GetEffectiveTheme(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EffectiveThemeValue.self,
			method: cast.getEffectiveTheme(_:_:),
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