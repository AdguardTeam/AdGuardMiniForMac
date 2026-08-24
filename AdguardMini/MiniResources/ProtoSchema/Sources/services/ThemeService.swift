// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Shared service for resolving the effective theme across UI modules
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `ThemeService.ServiceType` IN SEPARATE SOURCE FILE
public protocol ThemeServiceProtocol
{
	/// Get effective theme
	func getEffectiveTheme (
						_ message: EmptyValue,
						_ promise: @escaping (EffectiveThemeValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `ThemeService.ServiceType`.

/// Shared service for resolving the effective theme across UI modules
open class ThemeService: WebViewBridge
{
	public override var serviceName: String { "ThemeService" }
	public typealias ServiceType = ThemeService & Service & ThemeServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "GetEffectiveTheme":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getEffectiveTheme(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("ThemeService.GetEffectiveTheme: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("ThemeService.GetEffectiveTheme: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("ThemeService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("ThemeService instance must conform to its ServiceType protocol")
	}
}
