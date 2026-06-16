// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupReducer.swift
//  PopupExtension
//

import Foundation
import AML

private enum Constants {
    static let rateUrl = URL(
        string: "https://link.adtidy.org/forward.html?action=appstore&from=options_screen&app=mac-mini"
    )!
    static let safariProtectionPage = "safari_protection"
}

/// Pure reducer for the popup. All business logic lives here — no I/O,
/// no `Date()`/`UUID()` calls, no hidden globals (clocks and identifiers
/// are passed in via state or action payloads).
enum PopupReducer {
    // Flat dispatch table; cyclomatic complexity is structural (each branch delegates).
    // swiftlint:disable:next cyclomatic_complexity
    static func reduce(
        state: Store.State,
        action: Store.Action
    ) -> (Store.State, [Store.Effect]) {
        switch action {
        // MARK: External events
        case let .mainAppRunningChanged(running):
            return Self.handleMainAppRunningChanged(state: state, running: running)
        case let .appStateChanged(snapshot):
            return Self.handleAppStateChanged(state: state, snapshot: snapshot)
        case let .themeChanged(theme):
            return (state, [.setAppTheme(theme)])
        case let .logLevelChanged(level):
            return (state, [.setLogLevel(level)])
        case let .tabContextUpdated(stats, context):
            return Self.handleTabContextUpdated(state: state, stats: stats, context: context)

        // MARK: Toolbar
        case .toolbarValidationRequested:
            return Self.handleToolbarValidationRequested(state: state)
        case .toolbarValidationResolved:
            // Toolbar render reads the snapshot directly; no state change.
            return (state, [])

        // MARK: User actions
        case let .protectionForUrlToggled(enable):
            return Self.handleProtectionForUrlToggled(state: state, enable: enable)
        case .pauseTapped:
            return Self.handlePauseTapped(state: state)
        case .fixItTapped:
            return Self.handleFixItTapped(state: state)
        case .blockElementTapped:
            return Self.handleBlockElementTapped(state: state)
        case .reportIssueTapped:
            return Self.handleReportIssueTapped(state: state)
        case .rateTapped:
            return Self.handleRateTapped(state: state)
        case .settingsTapped:
            return Self.handleSettingsTapped(state: state)
        case .infoButtonTapped:
            return Self.handleInfoButtonTapped(state: state)
        case .upsellTapped:
            return Self.handleUpsellTapped(state: state)

        // MARK: Effect completions
        case let .appStateRefreshSkipped(isXpcUnavailable):
            return Self.handleAppStateRefreshSkipped(state: state, isXpcUnavailable: isXpcUnavailable)
        case let .setProtectionStatusCompleted(result):
            return Self.handleSetProtectionStatusCompleted(state: state, result: result)
        case let .setFilteringStatusCompleted(result):
            return Self.handleSetFilteringStatusCompleted(state: state, result: result)
        case let .launchMainAppCompleted(error):
            return Self.handleVoidCompletion(state: state, error: error, errorMap: .launchFailed)
        case let .restartMainAppCompleted(error):
            return Self.handleVoidCompletion(state: state, error: error, errorMap: .restartFailed)
        case let .openSafariSettingsCompleted(error):
            return Self.handleOpenSafariSettingsCompleted(state: state, error: error)
        case let .openSettingsCompleted(error):
            return Self.handleOpenSettingsCompleted(state: state, error: error)
        case let .blockElementCompleted(pageFound):
            return Self.handleBlockElementCompleted(state: state, pageFound: pageFound)
        case let .reportSiteCompleted(result):
            return Self.handleReportSiteCompleted(state: state, result: result)
        case let .prereqsRefreshSkipped(isXpcUnavailable):
            return Self.handlePrereqsRefreshSkipped(state: state, isXpcUnavailable: isXpcUnavailable)
        case let .prereqsRefreshed(onboardingCompleted, tabUrl, isFilteringEnabled):
            return Self.handlePrereqsRefreshed(
                state: state,
                onboardingCompleted: onboardingCompleted,
                tabUrl: tabUrl,
                isFilteringEnabled: isFilteringEnabled
            )
        case let .healthCheckRefreshed(hasAttention):
            return Self.handleHealthCheckRefreshed(state: state, hasAttention: hasAttention)
        case let .popupReady(hasAttention):
            return Self.handlePopupReady(state: state, hasHealthCheckAttention: hasAttention)
        // MARK: Lifecycle
        case .popupWillShow:
            return Self.handlePopupWillShow(state: state)
        case .popupOpened:
            return Self.handlePopupOpened(state: state)
        }
    }
}

// MARK: - Helpers

private extension PopupReducer {
    static func mainOrHealthCheckAttention(_ state: Store.State) -> Telemetry.Screen {
        state.hasHealthCheckAttention ? .healthCheckAttention : .main
    }

    static func currentLayout(_ state: Store.State) -> Store.PopupLayout {
        LayoutResolver.resolve(
            mainAppRunning: state.mainAppRunning,
            onboardingStatus: state.onboardingStatus,
            protectionEnabled: state.protectionEnabled,
            lastError: state.lastError,
            xpcAvailable: state.xpcAvailable
        )
    }

    static func pageViewEffects(state: Store.State) -> [Store.Effect] {
        let screen: Telemetry.Screen?
        switch currentLayout(state) {
        case .domain: screen = mainOrHealthCheckAttention(state)
        case .protectionIsDisabled: screen = .protectionDisabled
        case .somethingWentWrong: screen = .failedEnableProtection
        case .adguardNotLaunched, .xpcUnavailable, .onboardingWasntCompleted: screen = nil
        }
        return screen.map { [.sendTelemetry(.pageView($0))] } ?? []
    }

    // MARK: - External events

    static func handleTabContextUpdated(
        state: Store.State,
        stats: TabStats,
        context: Store.TabContext
    ) -> (Store.State, [Store.Effect]) {
        var next = state
        next.tabStats = stats
        next.tabContext = context
        let urlString = context.url?.absoluteString ?? ""
        next.protectionEnabledForCurrentUrl = urlString.isEmpty || !next.pausedUrls.contains(urlString)
        return (next, [])
    }

    static func handleMainAppRunningChanged(
        state: Store.State, running: Bool
    ) -> (Store.State, [Store.Effect]) {
        guard state.mainAppRunning != running else { return (state, []) }
        var next = state
        next.mainAppRunning = running
        if running {
            next.onboardingStatus = .unknown
            next.lastError = nil
            next.xpcAvailable = true
            return (next, RefreshPolicy.onMainAppStarted(state: next))
        }
        return (next, RefreshPolicy.onMainAppStopped())
    }

    static func handleAppStateChanged(
        state: Store.State, snapshot: Store.AppStateSnapshot
    ) -> (Store.State, [Store.Effect]) {
        var next = state
        next.xpcAvailable = true
        var effects: [Store.Effect] = []

        // Apply theme and logLevel unconditionally — they are idempotent.
        if let level = LogLevel(rawValue: Int(snapshot.logLevel)) {
            effects.append(.setLogLevel(level))
        }
        if let theme = Theme(rawValue: Int(snapshot.theme)) {
            effects.append(.setAppTheme(theme))
        }

        guard snapshot.lastCheckTime > state.lastAppStateTimestamp else {
            return (next, effects)
        }

        next.lastAppStateTimestamp = snapshot.lastCheckTime
        let protectionChanged = state.protectionEnabled != snapshot.isProtectionEnabled
        let hadError = state.lastError != nil
        next.protectionEnabled = snapshot.isProtectionEnabled
        next.isFreeUser = snapshot.isFreeUser
        next.isTrialAvailable = snapshot.isTrialAvailable
        next.trialDays = snapshot.trialDays
        next.lastError = nil
        if protectionChanged || hadError {
            effects.append(.requestToolbarUpdate)
        }

        return (next, effects)
    }

    // MARK: - Toolbar

    static func handleToolbarValidationRequested(
        state: Store.State
    ) -> (Store.State, [Store.Effect]) {
        (state, RefreshPolicy.onToolbarValidation(state: state))
    }

    // MARK: - User actions

    static func handleProtectionForUrlToggled(
        state: Store.State, enable: Bool
    ) -> (Store.State, [Store.Effect]) {
        guard state.inFlight == nil else { return (state, []) }
        guard let url = state.tabContext.url?.absoluteString, !url.isEmpty else {
            return (state, [])
        }
        var next = state
        next.inFlight = enable ? .enabling : .disabling
        if enable {
            next.pausedUrls.remove(url)
            next.protectionEnabledForCurrentUrl = true
        } else {
            next.pausedUrls.insert(url)
            next.protectionEnabledForCurrentUrl = false
            next.tabStats.adsBlocked = 0
            next.tabStats.trackersBlocked = 0
        }
        return (next, [
            .setFilteringStatusForUrl(url, enable: enable),
            .sendTelemetry(.action(.protectionPopupClick, screen: mainOrHealthCheckAttention(state)))
        ] + RefreshPolicy.onUrlProtectionToggled())
    }

    static func handlePauseTapped(state: Store.State) -> (Store.State, [Store.Effect]) {
        guard state.inFlight == nil else { return (state, []) }
        var next = state
        next.inFlight = .disabling
        return (next, [
            .setProtectionStatus(enable: false),
            .sendTelemetry(.action(.pauseProtectionPopupClick, screen: mainOrHealthCheckAttention(state)))
        ])
    }

    static func handleFixItTapped(state: Store.State) -> (Store.State, [Store.Effect]) {
        guard state.inFlight == nil else { return (state, []) }
        var next = state
        next.inFlight = .openingSettings
        return (next, [
            .openSettings(page: Constants.safariProtectionPage),
            .sendTelemetry(.action(.fixItPopupClick, screen: mainOrHealthCheckAttention(state)))
        ])
    }

    static func handleBlockElementTapped(state: Store.State) -> (Store.State, [Store.Effect]) {
        // Telemetry tracks the tap. Dismiss is deferred until the page-found completion.
        (state, [
            .dispatchPageScriptMessage(name: "blockElementPing"),
            .sendTelemetry(.action(.blockElementPopupClick, screen: mainOrHealthCheckAttention(state)))
        ])
    }

    static func handleReportIssueTapped(state: Store.State) -> (Store.State, [Store.Effect]) {
        guard state.inFlight == nil else { return (state, []) }
        guard let url = state.tabContext.url?.absoluteString, !url.isEmpty else {
            return (state, [])
        }
        var next = state
        next.inFlight = .reporting
        return (next, [
            .reportSite(url: url),
            .sendTelemetry(.action(.reportIssueClick, screen: mainOrHealthCheckAttention(state)))
        ])
    }

    static func handleRateTapped(state: Store.State) -> (Store.State, [Store.Effect]) {
        // Instant action; `dismissPopover` fires before `openUrlWithSystemHandler`.
        (state, [
            .dismissPopover,
            .openUrlWithSystemHandler(Constants.rateUrl),
            .sendTelemetry(.action(.rateMiniPopupClick, screen: mainOrHealthCheckAttention(state)))
        ])
    }

    static func handleSettingsTapped(state: Store.State) -> (Store.State, [Store.Effect]) {
        guard state.inFlight == nil else { return (state, []) }
        var next = state
        next.inFlight = .openingSettings
        let screen: Telemetry.Screen = currentLayout(state) == .protectionIsDisabled
            ? .protectionDisabled
            : mainOrHealthCheckAttention(state)
        return (next, [
            .openSettings(),
            .sendTelemetry(.action(.settingPopupClick, screen: screen))
        ])
    }

    static func handleInfoButtonTapped(state: Store.State) -> (Store.State, [Store.Effect]) {
        guard state.inFlight == nil else { return (state, []) }
        switch currentLayout(state) {
        case .domain:
            return (state, [])
        case .adguardNotLaunched:
            var next = state
            next.inFlight = .launching
            return (next, [.launchMainApp])
        case .xpcUnavailable:
            var next = state
            next.inFlight = .launching
            return (next, [.launchMainApp])
        case .protectionIsDisabled:
            var next = state
            next.inFlight = .enabling
            return (next, [.setProtectionStatus(enable: true)])
        case .somethingWentWrong:
            var next = state
            next.inFlight = .restarting
            return (next, [.restartMainApp])
        case .onboardingWasntCompleted:
            var next = state
            next.inFlight = .openingSettings
            // Dismiss is deferred to `handleOpenSettingsCompleted` so the user can see an error state if opening settings fails.
            return (next, [
                .openSettings(),
                .sendTelemetry(.action(.settingPopupClick, screen: mainOrHealthCheckAttention(state)))
            ])
        }
    }

    static func handleUpsellTapped(state: Store.State) -> (Store.State, [Store.Effect]) {
        guard state.inFlight == nil else { return (state, []) }
        return (state, [.openPurchase, .dismissPopover])
    }

    // MARK: - Effect completions

    static func handleSetProtectionStatusCompleted(
        state: Store.State, result: Result<EBATimestamp, Store.Error>
    ) -> (Store.State, [Store.Effect]) {
        var next = state
        next.inFlight = nil
        switch result {
        case let .success(timestamp):
            next.lastError = nil
            // Explicit refresh keeps the UI in sync if the app state push is delayed.
            return (next, RefreshPolicy.onUserActionCompleted(timestamp: timestamp))
        case let .failure(error):
            next.lastError = error
            return (next, [.sendTelemetry(.pageView(.failedEnableProtection))])
        }
    }

    static func handleSetFilteringStatusCompleted(
        state: Store.State, result: Result<EBATimestamp, Store.Error>
    ) -> (Store.State, [Store.Effect]) {
        var next = state
        next.inFlight = nil
        switch result {
        case let .success(timestamp):
            next.lastError = nil
            return (next, RefreshPolicy.onUserActionCompleted(timestamp: timestamp))
        case let .failure(error):
            next.lastError = error
            return (next, [])
        }
    }

    static func handleVoidCompletion(
        state: Store.State,
        error: Store.Error?,
        errorMap: Store.Error
    ) -> (Store.State, [Store.Effect]) {
        var next = state
        next.inFlight = nil
        if error != nil {
            next.lastError = errorMap
        } else {
            next.lastError = nil
        }
        return (next, [])
    }

    static func handleReportSiteCompleted(
        state: Store.State, result: Result<URL, Store.Error>
    ) -> (Store.State, [Store.Effect]) {
        var next = state
        next.inFlight = nil
        switch result {
        case let .success(url):
            next.lastError = nil
            return (next, [
                .openUrlInNewTab(url),
                .dismissPopover
            ])
        case let .failure(error):
            next.lastError = error
            return (next, [])
        }
    }

    static func handleOpenSafariSettingsCompleted(
        state: Store.State, error: Store.Error?
    ) -> (Store.State, [Store.Effect]) {
        var next = state
        next.inFlight = nil
        if error != nil {
            next.lastError = .openSafariSettingsFailed
            return (next, [])
        }
        next.lastError = nil
        return (next, [.dismissPopover])
    }

    static func handleOpenSettingsCompleted(
        state: Store.State, error: Store.Error?
    ) -> (Store.State, [Store.Effect]) {
        var next = state
        next.inFlight = nil
        if error != nil {
            next.lastError = .openSettingsFailed
            return (next, [])
        }
        next.lastError = nil
        return (next, [.dismissPopover])
    }

    static func handleBlockElementCompleted(
        state: Store.State, pageFound: Bool
    ) -> (Store.State, [Store.Effect]) {
        guard pageFound else { return (state, []) }
        return (state, [.dismissPopover])
    }

    static func handlePrereqsRefreshed(
        state: Store.State,
        onboardingCompleted: Bool,
        tabUrl: String,
        isFilteringEnabled: Bool
    ) -> (Store.State, [Store.Effect]) {
        var next = state
        next.xpcAvailable = true
        next.onboardingStatus = onboardingCompleted ? .completed : .notCompleted
        // Sync per-URL filtering state from the main app.
        // Falls back to tabStats.url when tabContext.url is nil.
        // Reason: validateToolbarItem can fire before page.properties().url resolves.
        var filteringChanged = false
        if !tabUrl.isEmpty {
            let wasPaused = next.pausedUrls.contains(tabUrl)
            if !isFilteringEnabled {
                if !wasPaused {
                    next.pausedUrls.insert(tabUrl)
                    filteringChanged = true
                    let activeUrl = next.tabContext.url?.absoluteString ?? next.tabStats.url
                    if activeUrl == tabUrl {
                        next.protectionEnabledForCurrentUrl = false
                    }
                }
            } else if wasPaused {
                // Server confirms filtering is enabled — clear the stale entry.
                // The popup will correctly show the site as filtered.
                next.pausedUrls.remove(tabUrl)
                filteringChanged = true
                let activeUrl = next.tabContext.url?.absoluteString ?? next.tabStats.url
                if activeUrl == tabUrl {
                    next.protectionEnabledForCurrentUrl = true
                }
            }
        }
        let layoutChanged = currentLayout(next) != currentLayout(state)
        let needsToolbarUpdate = next.onboardingStatus != state.onboardingStatus
            || filteringChanged
            || layoutChanged
        let effects: [Store.Effect] = needsToolbarUpdate ? [.requestToolbarUpdate] : []
        return (next, effects)
    }

    static func handleHealthCheckRefreshed(
        state: Store.State,
        hasAttention: Bool
    ) -> (Store.State, [Store.Effect]) {
        var next = state
        next.hasHealthCheckAttention = hasAttention
        return (next, [])
    }

    static func handleAppStateRefreshSkipped(
        state: Store.State,
        isXpcUnavailable: Bool
    ) -> (Store.State, [Store.Effect]) {
        guard isXpcUnavailable else { return (state, []) }
        var next = state
        next.xpcAvailable = false
        return (next, [])
    }

    static func handlePrereqsRefreshSkipped(
        state: Store.State,
        isXpcUnavailable: Bool
    ) -> (Store.State, [Store.Effect]) {
        guard isXpcUnavailable else { return (state, []) }
        var next = state
        next.xpcAvailable = false
        return (next, [])
    }

    // MARK: - Lifecycle

    static func handlePopupWillShow(
        state: Store.State
    ) -> (Store.State, [Store.Effect]) {
        (state, [.preparePopup])
    }

    static func handlePopupOpened(
        state: Store.State
    ) -> (Store.State, [Store.Effect]) {
        (state, [.notifyWindowOpened])
    }

    /// Handles the result of the `.preparePopup` effect.
    /// Updates health-check state and emits the initial page-view
    /// telemetry with the now-correct screen type.
    static func handlePopupReady(
        state: Store.State,
        hasHealthCheckAttention: Bool
    ) -> (Store.State, [Store.Effect]) {
        var next = state
        next.hasHealthCheckAttention = hasHealthCheckAttention
        return (next, self.pageViewEffects(state: next))
    }
}
