/// This code was generated automatically by proto-parser tool version 1

import Foundation
import SciterSwift

// MARK: Protocol definition

/// Service handles account info
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `AccountService.ServiceType` IN SEPARATE SOURCE FILE
public protocol AccountServiceProtocol
{
	/// Return License info
	func getLicense (
						_ message: EmptyValue,
						_ promise: @escaping (LicenseOrError) -> Void) -> Void
	/// Request to refresh the License
	func refreshLicense (
						_ message: EmptyValue,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Return available subscriptions info
	func getSubscriptionsInfo (
						_ message: EmptyValue,
						_ promise: @escaping (AppStoreSubscriptionsMessage) -> Void) -> Void
	/// Return trial availability
	func getTrialAvailableDays (
						_ message: EmptyValue,
						_ promise: @escaping (Int32Value) -> Void) -> Void
	/// Enter activation code
	func enterActivationCode (
						_ message: StringValue,
						_ promise: @escaping (EnterActivationCodeResultMessage) -> Void) -> Void
	/// Request opening activate page
	func requestActivate (
						_ message: EmptyValue,
						_ promise: @escaping (WebActivateResultMessage) -> Void) -> Void
	/// Request opening bind page
	func requestBind (
						_ message: StringValue,
						_ promise: @escaping (WebActivateResultMessage) -> Void) -> Void
	/// Request opening renew page
	func requestRenew (
						_ message: StringValue,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Request log out
	func requestLogout (
						_ message: EmptyValue,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Request purchase subscription
	func requestSubscribe (
						_ message: SubscriptionMessage,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Request restore purchases
	func requestRestorePurchases (
						_ message: EmptyValue,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Request opening subscriptions page
	func requestOpenSubscriptions (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Request opening app store page
	func requestOpenAppStore (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Request opening app store review page
	func requestOpenAppStoreReview (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// It is base class for custom service class with type `AccountService.ServiceType`

/// Service handles account info
open class AccountService: SciterBridge
{
	public override var serviceName: String { "AccountService" }
    public typealias ServiceType = AccountService & Service & AccountServiceProtocol

	/// Wrapper for `GetLicense`
	@objc func GetLicense(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: LicenseOrError.self,
			method: cast.getLicense(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RefreshLicense`
	@objc func RefreshLicense(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: OptionalError.self,
			method: cast.refreshLicense(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `GetSubscriptionsInfo`
	@objc func GetSubscriptionsInfo(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: AppStoreSubscriptionsMessage.self,
			method: cast.getSubscriptionsInfo(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `GetTrialAvailableDays`
	@objc func GetTrialAvailableDays(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: Int32Value.self,
			method: cast.getTrialAvailableDays(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `EnterActivationCode`
	@objc func EnterActivationCode(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: StringValue.self,
			outputType: EnterActivationCodeResultMessage.self,
			method: cast.enterActivationCode(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RequestActivate`
	@objc func RequestActivate(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: WebActivateResultMessage.self,
			method: cast.requestActivate(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RequestBind`
	@objc func RequestBind(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: StringValue.self,
			outputType: WebActivateResultMessage.self,
			method: cast.requestBind(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RequestRenew`
	@objc func RequestRenew(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: StringValue.self,
			outputType: OptionalError.self,
			method: cast.requestRenew(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RequestLogout`
	@objc func RequestLogout(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: OptionalError.self,
			method: cast.requestLogout(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RequestSubscribe`
	@objc func RequestSubscribe(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: SubscriptionMessage.self,
			outputType: OptionalError.self,
			method: cast.requestSubscribe(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RequestRestorePurchases`
	@objc func RequestRestorePurchases(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: OptionalError.self,
			method: cast.requestRestorePurchases(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RequestOpenSubscriptions`
	@objc func RequestOpenSubscriptions(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EmptyValue.self,
			method: cast.requestOpenSubscriptions(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RequestOpenAppStore`
	@objc func RequestOpenAppStore(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EmptyValue.self,
			method: cast.requestOpenAppStore(_:_:),
			message,
			promise
		)
	}

	/// Wrapper for `RequestOpenAppStoreReview`
	@objc func RequestOpenAppStoreReview(_ message: Data, promise: @escaping (Data) -> Void)
	{
		swiftCall(
			inputType: EmptyValue.self,
			outputType: EmptyValue.self,
			method: cast.requestOpenAppStoreReview(_:_:),
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