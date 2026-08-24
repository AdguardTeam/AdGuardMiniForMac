// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Service that handles client-platform communication
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `InternalService.ServiceType` IN SEPARATE SOURCE FILE
public protocol InternalServiceProtocol
{
	/// Opens settings window of Adguard window
	func openSettingsWindow (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Opens the user-rules editor window
	func openUserRulesWindow (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Closes the user-rules editor window (called by the editor after it  resolves
	/// unsaved changes, or immediately if there are none)
	func closeUserRulesWindow (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Returns the system UI language so the editor can localise translate()
	func getSystemLanguage (
						_ message: EmptyValue,
						_ promise: @escaping (StringValue) -> Void) -> Void
	/// Activates the Finder, and opens one window selecting the specified file
	func showInFinder (
						_ message: Path,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Opens report page in default browser
	func reportAnIssue (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `InternalService.ServiceType`.

/// Service that handles client-platform communication
open class InternalService: WebViewBridge
{
	public override var serviceName: String { "InternalService" }
	public typealias ServiceType = InternalService & Service & InternalServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "OpenSettingsWindow":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.openSettingsWindow(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("InternalService.OpenSettingsWindow: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("InternalService.OpenSettingsWindow: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "OpenUserRulesWindow":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.openUserRulesWindow(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("InternalService.OpenUserRulesWindow: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("InternalService.OpenUserRulesWindow: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "CloseUserRulesWindow":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.closeUserRulesWindow(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("InternalService.CloseUserRulesWindow: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("InternalService.CloseUserRulesWindow: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetSystemLanguage":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getSystemLanguage(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("InternalService.GetSystemLanguage: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("InternalService.GetSystemLanguage: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "ShowInFinder":
			do {
				let input = try Path(serializedBytes: bytes)
				cast.showInFinder(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("InternalService.ShowInFinder: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("InternalService.ShowInFinder: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "reportAnIssue":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.reportAnIssue(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("InternalService.reportAnIssue: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("InternalService.reportAnIssue: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("InternalService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("InternalService instance must conform to its ServiceType protocol")
	}
}
