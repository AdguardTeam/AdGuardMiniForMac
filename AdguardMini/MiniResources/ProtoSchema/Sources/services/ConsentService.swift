// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Shared service for telemetry and user consent across UI modules
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `ConsentService.ServiceType` IN SEPARATE SOURCE FILE
public protocol ConsentServiceProtocol
{
	/// Update allow telemetry
	func updateAllowTelemetry (
						_ message: BoolValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Update consent agreement
	func updateConsent (
						_ message: UserConsent,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `ConsentService.ServiceType`.

/// Shared service for telemetry and user consent across UI modules
open class ConsentService: WebViewBridge
{
	public override var serviceName: String { "ConsentService" }
	public typealias ServiceType = ConsentService & Service & ConsentServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "UpdateAllowTelemetry":
			do {
				let input = try BoolValue(serializedBytes: bytes)
				cast.updateAllowTelemetry(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("ConsentService.UpdateAllowTelemetry: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("ConsentService.UpdateAllowTelemetry: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateConsent":
			do {
				let input = try UserConsent(serializedBytes: bytes)
				cast.updateConsent(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("ConsentService.UpdateConsent: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("ConsentService.UpdateConsent: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("ConsentService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("ConsentService instance must conform to its ServiceType protocol")
	}
}
