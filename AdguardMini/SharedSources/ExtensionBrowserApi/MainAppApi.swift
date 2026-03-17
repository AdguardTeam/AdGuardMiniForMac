// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MainAppApi.swift
//  AdguardMini
//

import Foundation

let ExtensionSafariApiProtocolId = "SafariAPI:2026/03/11"

typealias EBATimestamp = TimeInterval

/// API that main app exported.
@objc
protocol MainAppApi {
    func appState(after time: EBATimestamp, reply: @escaping (EBAAppState?, Error?) -> Void)
    func appState(_ reply: @escaping (EBAAppState?, Error?) -> Void)
    func getCurrentFilteringState(withUrl url: String,
                                  reply: @escaping (EBACurrentFilteringState?, Error?) -> Void)
    func getExtraState(withUrl url: String, reply: @escaping (Bool, Error?) -> Void)
    func isAllExtensionsEnabled(reply: @escaping (Bool, Error?) -> Void)
    func isOnboardingCompleted(reply: @escaping (Bool, Error?) -> Void)
    func setProtectionStatus(_ enabled: Bool, reply: @escaping (EBATimestamp, Error?) -> Void)
    func setFilteringStatusWithUrl(_ url: String,
                                   isEnabled: Bool,
                                   reply: @escaping (EBATimestamp, Error?) -> Void)
    func addRule(_ ruleText: String, reply: @escaping (Error?) -> Void)
    func reportSite(with url: String,
                    reply: @escaping (String?, Error?) -> Void)
    func openSafariSettings(reply: @escaping (Error?) -> Void)

    func telemetryPageViewEvent(_ screenName: String, reply: @escaping (Error?) -> Void)
    func telemetryActionEvent(screenName: String, action: String, reply: @escaping (Error?) -> Void)

    func notifyWindowOpened(reply: @escaping (Error?) -> Void)

    func reportBlockCounts(_ counts: [String: Int64], reply: @escaping (Error?) -> Void)
}
