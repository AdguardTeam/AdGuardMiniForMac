// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Shared service for cross-module system and navigation actions
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `SystemService.ServiceType` IN SEPARATE SOURCE FILE
public protocol SystemServiceProtocol
{
	/// Request open settings page
	func requestOpenSettingsPage (
						_ message: StringValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Open login items settings
	func openLoginItemsSettings (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `SystemService.ServiceType`.

/// Shared service for cross-module system and navigation actions
open class SystemService: WebViewBridge
{
	public override var serviceName: String { "SystemService" }
	public typealias ServiceType = SystemService & Service & SystemServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "RequestOpenSettingsPage":
			do {
				let input = try StringValue(serializedBytes: bytes)
				cast.requestOpenSettingsPage(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SystemService.RequestOpenSettingsPage: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SystemService.RequestOpenSettingsPage: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "OpenLoginItemsSettings":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.openLoginItemsSettings(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("SystemService.OpenLoginItemsSettings: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("SystemService.OpenLoginItemsSettings: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("SystemService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("SystemService instance must conform to its ServiceType protocol")
	}
}
