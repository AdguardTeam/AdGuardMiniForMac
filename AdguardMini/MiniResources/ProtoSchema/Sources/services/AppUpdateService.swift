// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Shared service for application version checks and update requests
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `AppUpdateService.ServiceType` IN SEPARATE SOURCE FILE
public protocol AppUpdateServiceProtocol
{
	/// Fires an event for Swift to check the application version; result will be
	/// dispatched by TrayCallbackService.OnApplicationVersionStatusResolved
	func checkApplicationVersion (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Request to update application
	func requestApplicationUpdate (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `AppUpdateService.ServiceType`.

/// Shared service for application version checks and update requests
open class AppUpdateService: WebViewBridge
{
	public override var serviceName: String { "AppUpdateService" }
	public typealias ServiceType = AppUpdateService & Service & AppUpdateServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "CheckApplicationVersion":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.checkApplicationVersion(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AppUpdateService.CheckApplicationVersion: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AppUpdateService.CheckApplicationVersion: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "RequestApplicationUpdate":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.requestApplicationUpdate(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("AppUpdateService.RequestApplicationUpdate: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("AppUpdateService.RequestApplicationUpdate: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("AppUpdateService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("AppUpdateService instance must conform to its ServiceType protocol")
	}
}
