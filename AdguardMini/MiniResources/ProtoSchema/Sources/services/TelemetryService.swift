// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Service that handles telemetry events
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `TelemetryService.ServiceType` IN SEPARATE SOURCE FILE
public protocol TelemetryServiceProtocol
{
	/// Record telemetry event
	func recordEvent (
						_ message: TelemetryEvent,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get active AB tests
	func getActiveABTests (
						_ message: EmptyValue,
						_ promise: @escaping (ActiveABTests) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `TelemetryService.ServiceType`.

/// Service that handles telemetry events
open class TelemetryService: WebViewBridge
{
	public override var serviceName: String { "TelemetryService" }
	public typealias ServiceType = TelemetryService & Service & TelemetryServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "RecordEvent":
			do {
				let input = try TelemetryEvent(serializedBytes: bytes)
				cast.recordEvent(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("TelemetryService.RecordEvent: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("TelemetryService.RecordEvent: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetActiveABTests":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getActiveABTests(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("TelemetryService.GetActiveABTests: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("TelemetryService.GetActiveABTests: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("TelemetryService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("TelemetryService instance must conform to its ServiceType protocol")
	}
}
