// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MainAppApi.swift
//  AdguardMini
//

import Foundation

let ExtensionSafariApiProtocolId = "SafariAPI:2026/08/11"

typealias EBATimestamp = TimeInterval

/// API that main app exported.
@objc
protocol MainAppApi {
    func appState(after time: EBATimestamp, reply: @escaping @Sendable (EBAAppState?, Error?) -> Void)
    func appState(_ reply: @escaping @Sendable (EBAAppState?, Error?) -> Void)
    func getCurrentFilteringState(withUrl url: String,
                                  reply: @escaping @Sendable (EBACurrentFilteringState?, Error?) -> Void)
    func getExtraState(withUrl url: String, reply: @escaping @Sendable (Bool, Error?) -> Void)
    func popupPresentationState(
        reply: @escaping @Sendable (_ hasAttention: Bool, _ isUpsellAvailable: Bool, _ error: Error?) -> Void
    )
    func isOnboardingCompleted(reply: @escaping @Sendable (Bool, Error?) -> Void)
    func setProtectionStatus(_ enabled: Bool, reply: @escaping @Sendable (EBATimestamp, Error?) -> Void)
    func setFilteringStatusWithUrl(_ url: String,
                                   isEnabled: Bool,
                                   reply: @escaping @Sendable (EBATimestamp, Error?) -> Void)
    func addRule(_ ruleText: String, reply: @escaping @Sendable (Error?) -> Void)
    func reportSite(with url: String,
                    reply: @escaping @Sendable (String?, Error?) -> Void)
    func openSafariSettings(reply: @escaping @Sendable (Error?) -> Void)

    func telemetryPageViewEvent(_ screenName: String, reply: @escaping @Sendable (Error?) -> Void)
    func telemetryActionEvent(screenName: String, action: String, reply: @escaping @Sendable (Error?) -> Void)

    func notifyWindowOpened(reply: @escaping @Sendable (Error?) -> Void)
}
