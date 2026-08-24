// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

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
// Base class for `AppInfoService.ServiceType`.

/// Service handles about app information
open class AppInfoService: WebViewBridge
{
	public override var serviceName: String { "AppInfoService" }
	public typealias ServiceType = AppInfoService & Service & AppInfoServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "GetAbout":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getAbout(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AppInfoService.GetAbout: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AppInfoService.GetAbout: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("AppInfoService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("AppInfoService instance must conform to its ServiceType protocol")
	}
}
