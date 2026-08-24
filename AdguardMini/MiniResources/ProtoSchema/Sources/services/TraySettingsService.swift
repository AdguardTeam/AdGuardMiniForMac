// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Tray-window-only service for tray settings and statistics
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `TraySettingsService.ServiceType` IN SEPARATE SOURCE FILE
public protocol TraySettingsServiceProtocol
{
	/// Get tray-specific settings
	func getTraySettings (
						_ message: EmptyValue,
						_ promise: @escaping (GlobalSettings) -> Void) -> Void
	/// Update tray-specific settings
	func updateTraySettings (
						_ message: GlobalSettings,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get blocking statistics
	func getStatistics (
						_ message: StatisticsRequest,
						_ promise: @escaping (StatisticsResponse) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `TraySettingsService.ServiceType`.

/// Tray-window-only service for tray settings and statistics
open class TraySettingsService: WebViewBridge
{
	public override var serviceName: String { "TraySettingsService" }
	public typealias ServiceType = TraySettingsService & Service & TraySettingsServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "GetTraySettings":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getTraySettings(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("TraySettingsService.GetTraySettings: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("TraySettingsService.GetTraySettings: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "UpdateTraySettings":
			do {
				let input = try GlobalSettings(serializedBytes: bytes)
				cast.updateTraySettings(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("TraySettingsService.UpdateTraySettings: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("TraySettingsService.UpdateTraySettings: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetStatistics":
			do {
				let input = try StatisticsRequest(serializedBytes: bytes)
				cast.getStatistics(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("TraySettingsService.GetStatistics: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("TraySettingsService.GetStatistics: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("TraySettingsService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("TraySettingsService instance must conform to its ServiceType protocol")
	}
}
