// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Service that handles client-platform communication
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `UserRulesService.ServiceType` IN SEPARATE SOURCE FILE
public protocol UserRulesServiceProtocol
{
	/// Get UserRules settings
	func getUserRules (
						_ message: EmptyValue,
						_ promise: @escaping (UserRules) -> Void) -> Void
	/// Add UserRule
	func addUserRule (
						_ message: StringValue,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Update UserRules settings
	func updateUserRules (
						_ message: UserRules,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Export UserRules settings
	func exportUserRules (
						_ message: Path,
						_ promise: @escaping (OptionalError) -> Void) -> Void
	/// Import UserRules settings
	func importUserRules (
						_ message: Path,
						_ promise: @escaping (UserRules) -> Void) -> Void
	/// Reset UserRules to default settings
	func resetUserRules (
						_ message: EmptyValue,
						_ promise: @escaping (UserRules) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `UserRulesService.ServiceType`.

/// Service that handles client-platform communication
open class UserRulesService: WebViewBridge
{
	public override var serviceName: String { "UserRulesService" }
	public typealias ServiceType = UserRulesService & Service & UserRulesServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "GetUserRules":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getUserRules(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("UserRulesService.GetUserRules: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("UserRulesService.GetUserRules: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "AddUserRule":
			do {
				let input = try StringValue(serializedBytes: bytes)
				cast.addUserRule(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("UserRulesService.AddUserRule: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("UserRulesService.AddUserRule: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateUserRules":
			do {
				let input = try UserRules(serializedBytes: bytes)
				cast.updateUserRules(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("UserRulesService.UpdateUserRules: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("UserRulesService.UpdateUserRules: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ExportUserRules":
			do {
				let input = try Path(serializedBytes: bytes)
				cast.exportUserRules(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("UserRulesService.ExportUserRules: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("UserRulesService.ExportUserRules: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ImportUserRules":
			do {
				let input = try Path(serializedBytes: bytes)
				cast.importUserRules(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("UserRulesService.ImportUserRules: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("UserRulesService.ImportUserRules: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ResetUserRules":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.resetUserRules(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("UserRulesService.ResetUserRules: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("UserRulesService.ResetUserRules: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("UserRulesService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("UserRulesService instance must conform to its ServiceType protocol")
	}
}
