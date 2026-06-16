// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Effect.swift
//  PopupExtension
//

import Foundation
import AML

extension Store {
    /// Side-effects returned by the reducer alongside a new state.
    /// Executed by `EffectRunner`.
    /// Pure value-typed descriptions; no hidden state.
    enum Effect: Equatable {
        case setProtectionStatus(enable: Bool)
        case setFilteringStatusForUrl(String, enable: Bool)
        case refreshAppState(after: EBATimestamp? = nil)
        case refreshPrereqs(markStale: Bool, tabUrl: String)
        case launchMainApp
        case restartMainApp
        case openSafariSettings
        case openSettings(page: String? = nil)
        case openPurchase
        case reportSite(url: String)
        case openUrlInNewTab(URL)
        case openUrlWithSystemHandler(URL)
        case requestToolbarUpdate
        case dispatchPageScriptMessage(name: String)
        case sendTelemetry(Telemetry.Event)
        case setLogLevel(LogLevel)
        case setAppTheme(Theme)
        case dismissPopover
        case notifyWindowOpened
        case refreshHealthCheck
        case preparePopup
    }
}
