// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by proto-parser tool version 1

// WKWebView-only callback bridge.

// MARK: `toSciter` / WKWebView service implementation

/// Service handles onboarding updates
public class OnboardingCallbackService: WebViewCallbackBridge
{
	/// Fires when effective theme changed
	/// Dispatch callback through the attached bridge.
	@discardableResult public func onEffectiveThemeChanged (_ message: EffectiveThemeValue) -> EmptyValue {
		if let bridge {
			do {
				bridge.dispatchCallback(
					method: "OnboardingCallbackService.OnEffectiveThemeChanged",
					data: try message.serializedData()
				)
			} catch {
				BridgeLog.error("OnboardingCallbackService.OnEffectiveThemeChanged: failed to serialize: \(error)")
			}
		} else {
			// A nil bridge is an expected transient condition during
			// startup (before the host attaches); debug-level avoids
			// error-monitoring noise for a routine startup race.
			BridgeLog.debug("OnboardingCallbackService.OnEffectiveThemeChanged: bridge is nil — callback dropped")
		}
		return EmptyValue()
	}
}
