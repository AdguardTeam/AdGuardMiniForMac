// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Service handles about app information
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `FiltersService.ServiceType` IN SEPARATE SOURCE FILE
public protocol FiltersServiceProtocol
{
	/// Get Filters app info
	func getFiltersMetadata (
						_ message: EmptyValue,
						_ promise: @escaping (Filters) -> Void) -> Void
	/// Get ids of enabled filters
	func getEnabledFiltersIds (
						_ message: EmptyValue,
						_ promise: @escaping (FiltersEnabledIds) -> Void) -> Void
	/// Check Custom Filter
	func checkCustomFilter (
						_ message: Path,
						_ promise: @escaping (FilterOrError) -> Void) -> Void
	/// Confirm add Custom filter
	func confirmAddCustomFilter (
						_ message: CustomFilterToAdd,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Delete custom filters
	func deleteCustomFilters (
						_ message: CustomFiltersToDelete,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Update filters settings
	func updateFilters (
						_ message: FiltersUpdate,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Get filters index
	func getFiltersIndex (
						_ message: EmptyValue,
						_ promise: @escaping (FiltersIndex) -> Void) -> Void
	/// Update custom filter
	func updateCustomFilter (
						_ message: CustomFilterUpdateRequest,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Request update on filter library, result will be dispatch by
	/// TrayCallbackService.OnFilterStatusResolved
	func requestFiltersUpdate (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Request filters divided by safari extension
	func getFiltersGroupedByExtensions (
						_ message: EmptyValue,
						_ promise: @escaping (FiltersGroupedByExtensions) -> Void) -> Void
	/// Update language specific
	func updateLanguageSpecific (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `FiltersService.ServiceType`.

/// Service handles about app information
open class FiltersService: WebViewBridge
{
	public override var serviceName: String { "FiltersService" }
	public typealias ServiceType = FiltersService & Service & FiltersServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "GetFiltersMetadata":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getFiltersMetadata(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("FiltersService.GetFiltersMetadata: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("FiltersService.GetFiltersMetadata: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetEnabledFiltersIds":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getEnabledFiltersIds(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("FiltersService.GetEnabledFiltersIds: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("FiltersService.GetEnabledFiltersIds: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "CheckCustomFilter":
			do {
				let input = try Path(serializedBytes: bytes)
				cast.checkCustomFilter(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("FiltersService.CheckCustomFilter: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("FiltersService.CheckCustomFilter: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ConfirmAddCustomFilter":
			do {
				let input = try CustomFilterToAdd(serializedBytes: bytes)
				cast.confirmAddCustomFilter(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("FiltersService.ConfirmAddCustomFilter: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("FiltersService.ConfirmAddCustomFilter: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "DeleteCustomFilters":
			do {
				let input = try CustomFiltersToDelete(serializedBytes: bytes)
				cast.deleteCustomFilters(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("FiltersService.DeleteCustomFilters: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("FiltersService.DeleteCustomFilters: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateFilters":
			do {
				let input = try FiltersUpdate(serializedBytes: bytes)
				cast.updateFilters(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("FiltersService.UpdateFilters: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("FiltersService.UpdateFilters: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetFiltersIndex":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getFiltersIndex(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("FiltersService.GetFiltersIndex: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("FiltersService.GetFiltersIndex: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateCustomFilter":
			do {
				let input = try CustomFilterUpdateRequest(serializedBytes: bytes)
				cast.updateCustomFilter(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("FiltersService.UpdateCustomFilter: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("FiltersService.UpdateCustomFilter: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RequestFiltersUpdate":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.requestFiltersUpdate(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("FiltersService.RequestFiltersUpdate: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("FiltersService.RequestFiltersUpdate: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetFiltersGroupedByExtensions":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getFiltersGroupedByExtensions(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("FiltersService.GetFiltersGroupedByExtensions: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("FiltersService.GetFiltersGroupedByExtensions: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateLanguageSpecific":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateLanguageSpecific(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("FiltersService.UpdateLanguageSpecific: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("FiltersService.UpdateLanguageSpecific: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("FiltersService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("FiltersService instance must conform to its ServiceType protocol")
	}
}
