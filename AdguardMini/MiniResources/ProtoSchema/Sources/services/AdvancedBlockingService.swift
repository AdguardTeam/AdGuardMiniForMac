// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Service handles Advanced blocking page
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `AdvancedBlockingService.ServiceType` IN SEPARATE SOURCE FILE
public protocol AdvancedBlockingServiceProtocol
{
	/// Get AdvancedRules
	func getAdvancedRules (
						_ message: EmptyValue,
						_ promise: @escaping (BoolValue) -> Void) -> Void
	/// Update AdvancedRules
	func updateAdvancedRules (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get AdguardExtra
	func getAdguardExtra (
						_ message: EmptyValue,
						_ promise: @escaping (BoolValue) -> Void) -> Void
	/// Update AdguardExtra
	func updateAdguardExtra (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get MailProtection
	func getMailProtection (
						_ message: EmptyValue,
						_ promise: @escaping (BoolValue) -> Void) -> Void
	/// Update MailProtection
	func updateMailProtection (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get RealTimeFiltersUpdate
	func getRealTimeFiltersUpdate (
						_ message: EmptyValue,
						_ promise: @escaping (BoolValue) -> Void) -> Void
	/// Update RealTimeFiltersUpdate
	func updateRealTimeFiltersUpdate (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get URLFilter state
	func getURLFilterState (
						_ message: EmptyValue,
						_ promise: @escaping (URLFilterState) -> Void) -> Void
	/// Set URLFilter enabled state
	func setURLFilterEnabled (
						_ message: BoolValue,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Update URLFilter protection level
	func updateURLFilterProtectionLevel (
						_ message: URLFilterProtectionLevelUpdate,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Reset URLFilter prefilter cache
	func resetURLFilterCache (
						_ message: EmptyValue,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Remove URLFilter configuration
	func removeURLFilter (
						_ message: EmptyValue,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Get URLFilter seen
	func getURLFilterSeen (
						_ message: EmptyValue,
						_ promise: @escaping (BoolValue) -> Void) -> Void
	/// Update URLFilterSeen state
	func updateURLFilterSeen (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `AdvancedBlockingService.ServiceType`.

/// Service handles Advanced blocking page
open class AdvancedBlockingService: WebViewBridge
{
	public override var serviceName: String { "AdvancedBlockingService" }
	public typealias ServiceType = AdvancedBlockingService & Service & AdvancedBlockingServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "GetAdvancedRules":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getAdvancedRules(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.GetAdvancedRules: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.GetAdvancedRules: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateAdvancedRules":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateAdvancedRules(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.UpdateAdvancedRules: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.UpdateAdvancedRules: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetAdguardExtra":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getAdguardExtra(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.GetAdguardExtra: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.GetAdguardExtra: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateAdguardExtra":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateAdguardExtra(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.UpdateAdguardExtra: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.UpdateAdguardExtra: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetMailProtection":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getMailProtection(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.GetMailProtection: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.GetMailProtection: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateMailProtection":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateMailProtection(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.UpdateMailProtection: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.UpdateMailProtection: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetRealTimeFiltersUpdate":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getRealTimeFiltersUpdate(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.GetRealTimeFiltersUpdate: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.GetRealTimeFiltersUpdate: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateRealTimeFiltersUpdate":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateRealTimeFiltersUpdate(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.UpdateRealTimeFiltersUpdate: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.UpdateRealTimeFiltersUpdate: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetURLFilterState":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getURLFilterState(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.GetURLFilterState: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.GetURLFilterState: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "SetURLFilterEnabled":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.setURLFilterEnabled(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.SetURLFilterEnabled: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.SetURLFilterEnabled: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateURLFilterProtectionLevel":
			do {
				let input = try URLFilterProtectionLevelUpdate(serializedBytes: bytes)
				cast.updateURLFilterProtectionLevel(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.UpdateURLFilterProtectionLevel: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.UpdateURLFilterProtectionLevel: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ResetURLFilterCache":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.resetURLFilterCache(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.ResetURLFilterCache: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.ResetURLFilterCache: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RemoveURLFilter":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.removeURLFilter(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.RemoveURLFilter: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.RemoveURLFilter: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetURLFilterSeen":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getURLFilterSeen(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.GetURLFilterSeen: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.GetURLFilterSeen: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateURLFilterSeen":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateURLFilterSeen(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AdvancedBlockingService.UpdateURLFilterSeen: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AdvancedBlockingService.UpdateURLFilterSeen: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("AdvancedBlockingService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("AdvancedBlockingService instance must conform to its ServiceType protocol")
	}
}
