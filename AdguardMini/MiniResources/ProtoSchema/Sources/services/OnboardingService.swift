// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

import Foundation
// WKWebView-only service bridge.

// MARK: Protocol definition

/// Service that handles client-platform communication
/// YOU MUST IMPLEMENT THIS PROTOCOL USING CLASS WITH TYPE `OnboardingService.ServiceType` IN SEPARATE SOURCE FILE
public protocol OnboardingServiceProtocol
{
	/// Notifies that onboarding did complete.
	func onboardingDidComplete (
						_ message: EmptyValue,
						_ promise: @escaping (EmptyValue) -> Void) -> Void
	/// Get system language
	func getSystemLanguage (
						_ message: EmptyValue,
						_ promise: @escaping (StringValue) -> Void) -> Void
}

// MARK: Protobuf Bridge definition
// Base class for `OnboardingService.ServiceType`.

/// Service that handles client-platform communication
open class OnboardingService: WebViewBridge
{
	public override var serviceName: String { "OnboardingService" }
	public typealias ServiceType = OnboardingService & Service & OnboardingServiceProtocol

	/// WKWebView dispatch entry.
	public override func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void) {
		switch method {
		case "OnboardingDidComplete":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.onboardingDidComplete(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("OnboardingService.OnboardingDidComplete: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("OnboardingService.OnboardingDidComplete: failed to deserialize request: \(error)")
				promise(Data())
			}
		case "GetSystemLanguage":
			do {
				let input = try EmptyValue(serializedBytes: bytes)
				cast.getSystemLanguage(input) { result in
					do {
						promise(try result.serializedData())
					} catch {
						BridgeLog.error("OnboardingService.GetSystemLanguage: failed to serialize reply: \(error)")
						promise(Data())
					}
				}
			} catch {
				BridgeLog.error("OnboardingService.GetSystemLanguage: failed to deserialize request: \(error)")
				promise(Data())
			}
		default:
			BridgeLog.error("OnboardingService.handleRequest: unknown method \"\(method)\"")
			promise(Data())
		}
	}

	private var cast : ServiceType
	{
		if let service = self as? ServiceType {
			return service
		}

		fatalError("OnboardingService instance must conform to its ServiceType protocol")
	}
}
