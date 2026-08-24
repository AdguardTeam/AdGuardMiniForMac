// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Service handles account info
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `AccountService.ServiceType` IN SEPARATE SOURCE FILE
public protocol AccountServiceProtocol
{
	/// Return License info
	func getLicense (
						_ message: EmptyValue,
						_ promise: @escaping (LicenseOrError) -> Void) -> Void
	/// Return tray-scoped License info
	func getTrayLicense (
						_ message: EmptyValue,
						_ promise: @escaping (TrayLicenseOrError) -> Void) -> Void
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
// Base class for `AccountService.ServiceType`.

/// Service handles account info
open class AccountService: WebViewBridge
{
	public override var serviceName: String { "AccountService" }
	public typealias ServiceType = AccountService & Service & AccountServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "GetLicense":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getLicense(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.GetLicense: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.GetLicense: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetTrayLicense":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getTrayLicense(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.GetTrayLicense: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.GetTrayLicense: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RefreshLicense":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.refreshLicense(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.RefreshLicense: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.RefreshLicense: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetSubscriptionsInfo":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getSubscriptionsInfo(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.GetSubscriptionsInfo: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.GetSubscriptionsInfo: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetTrialAvailableDays":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getTrialAvailableDays(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.GetTrialAvailableDays: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.GetTrialAvailableDays: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "EnterActivationCode":
			do {
				let input = try StringValue(serializedBytes: bytes)
				cast.enterActivationCode(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.EnterActivationCode: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.EnterActivationCode: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RequestActivate":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.requestActivate(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.RequestActivate: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.RequestActivate: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RequestBind":
			do {
				let input = try StringValue(serializedBytes: bytes)
				cast.requestBind(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.RequestBind: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.RequestBind: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RequestRenew":
			do {
				let input = try StringValue(serializedBytes: bytes)
				cast.requestRenew(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.RequestRenew: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.RequestRenew: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RequestLogout":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.requestLogout(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.RequestLogout: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.RequestLogout: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RequestSubscribe":
			do {
				let input = try SubscriptionMessage(serializedBytes: bytes)
				cast.requestSubscribe(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.RequestSubscribe: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.RequestSubscribe: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RequestRestorePurchases":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.requestRestorePurchases(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.RequestRestorePurchases: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.RequestRestorePurchases: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RequestOpenSubscriptions":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.requestOpenSubscriptions(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.RequestOpenSubscriptions: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.RequestOpenSubscriptions: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RequestOpenAppStore":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.requestOpenAppStore(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.RequestOpenAppStore: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.RequestOpenAppStore: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RequestOpenAppStoreReview":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.requestOpenAppStoreReview(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AccountService.RequestOpenAppStoreReview: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AccountService.RequestOpenAppStoreReview: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("AccountService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("AccountService instance must conform to its ServiceType protocol")
	}
}
