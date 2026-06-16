// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Action.swift
//  PopupExtension
//

import Foundation
@preconcurrency import AML

extension Store {
    /// Single entry point into the reducer. All payloads are `Sendable`
    /// and `Equatable` (`Result<Void, Error>` is avoided; void completions
    /// use `Store.Error?` instead so that the whole enum is `Equatable`
    /// and tests can use `XCTAssertEqual` directly).
    /// No references to UI, AppKit, or Safari API objects.
    enum Action: Sendable, Equatable {
        // MARK: External events

        case mainAppRunningChanged(Bool)
        case appStateChanged(AppStateSnapshot)
        case themeChanged(Theme)
        case logLevelChanged(LogLevel)
        case tabContextUpdated(stats: TabStats, context: TabContext)

        // MARK: Toolbar

        case toolbarValidationRequested(window: SafariWindowToken)
        case toolbarValidationResolved(
            window: SafariWindowToken,
            isOn: Bool,
            badgeText: String
        )

        // MARK: User actions

        case protectionForUrlToggled(Bool)
        case pauseTapped
        case fixItTapped
        case blockElementTapped
        case reportIssueTapped
        case rateTapped
        case settingsTapped
        case infoButtonTapped
        case upsellTapped

        // MARK: Effect completions

        case appStateRefreshSkipped(isXpcUnavailable: Bool)
        case setProtectionStatusCompleted(Result<EBATimestamp, Store.Error>)
        case setFilteringStatusCompleted(Result<EBATimestamp, Store.Error>)
        case launchMainAppCompleted(Store.Error?)
        case restartMainAppCompleted(Store.Error?)
        case openSafariSettingsCompleted(Store.Error?)
        case openSettingsCompleted(Store.Error?)
        case blockElementCompleted(pageFound: Bool)
        case reportSiteCompleted(Result<URL, Store.Error>)
        case prereqsRefreshSkipped(isXpcUnavailable: Bool)
        case prereqsRefreshed(
            onboardingCompleted: Bool,
            tabUrl: String,
            isFilteringEnabled: Bool
        )
        case healthCheckRefreshed(hasAttention: Bool)
        case popupReady(hasHealthCheckAttention: Bool)
        // MARK: Lifecycle

        case popupWillShow
        case popupOpened(openedAt: Date)
    }
}
