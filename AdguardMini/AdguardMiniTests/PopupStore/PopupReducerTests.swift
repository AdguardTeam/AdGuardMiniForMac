// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupReducerTests.swift
//  AdguardMiniTests
//

// swiftlint:disable file_length

import XCTest
import AML

// MARK: - Constants

private enum Constants {
    static let anyWindowToken = Store.SafariWindowToken(rawValue: 1)
    static let referenceDate = Date(timeIntervalSinceReferenceDate: 0)
    static let knownTimestamp: EBATimestamp = 100
    static let staleTimestamp: EBATimestamp = 50
    static let freshTimestamp: EBATimestamp = 200
    static let exampleURL = URL(string: "https://example.com")!
    static let siteAURL = URL(string: "https://a.com")!
    static let siteBURL = URL(string: "https://b.com")!
}

final class PopupReducerTests: XCTestCase {
    // MARK: Helpers

    /// Convenience constructor: only the fields touched by the test are
    /// passed; everything else inherits from `Store.State.initial`.
    private func state(
        mainAppRunning: Bool = true,
        onboardingStatus: Store.OnboardingStatus = .completed,
        protectionEnabled: Bool = true,
        protectionEnabledForCurrentUrl: Bool = true,
        hasHealthCheckAttention: Bool = false,
        xpcAvailable: Bool = true,
        isFreeUser: Bool = true,
        isTrialAvailable: Bool = false,
        trialDays: Int = 0,
        tabStats: TabStats = TabStats(),
        tabContext: Store.TabContext = .empty,
        pausedUrls: Set<String> = [],
        inFlight: Store.InFlightAction? = nil,
        lastError: Store.Error? = nil,
        lastAppStateTimestamp: EBATimestamp = .zero
    ) -> Store.State {
        Store.State(
            mainAppRunning: mainAppRunning,
            onboardingStatus: onboardingStatus,
            protectionEnabled: protectionEnabled,
            protectionEnabledForCurrentUrl: protectionEnabledForCurrentUrl,
            hasHealthCheckAttention: hasHealthCheckAttention,
            xpcAvailable: xpcAvailable,
            isFreeUser: isFreeUser,
            isTrialAvailable: isTrialAvailable,
            trialDays: trialDays,
            tabStats: tabStats,
            tabContext: tabContext,
            pausedUrls: pausedUrls,
            inFlight: inFlight,
            lastError: lastError,
            lastAppStateTimestamp: lastAppStateTimestamp
        )
    }

    // MARK: Smoke

    func testThemeChangedEmitsSetAppThemeEffect() {
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .themeChanged(.system)
        )
        XCTAssertEqual(next, initial)
        XCTAssertEqual(effects, [.setAppTheme(.system)])
    }

    func testLogLevelChangedEmitsSetLogLevelEffect() {
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .logLevelChanged(.debug)
        )
        XCTAssertEqual(next, initial)
        XCTAssertEqual(effects, [.setLogLevel(.debug)])
    }

    func testTabContextUpdatedReplacesStatsAndContextAndEmitsNoEffects() {
        var stats = TabStats()
        stats.adsBlocked = 7
        stats.url = Constants.siteAURL.absoluteString
        let url = Constants.siteAURL
        let context = Store.TabContext(
            windowToken: Constants.anyWindowToken, url: url, domain: url.host!, isSystemPage: false
        )
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .tabContextUpdated(stats: stats, context: context)
        )
        XCTAssertEqual(next.tabStats, stats)
        XCTAssertEqual(next.tabContext, context)
        XCTAssertTrue(next.protectionEnabledForCurrentUrl)
        XCTAssertTrue(effects.isEmpty)
    }

    func testTabContextUpdatedClearsDisabledStateForUnpausedUrl() {
        // Protection was disabled for site A; switching to site B must show protection as enabled.
        let pausedUrl = Constants.siteAURL
        let newUrl = Constants.siteBURL
        let context = Store.TabContext(
            windowToken: nil, url: newUrl, domain: newUrl.host!, isSystemPage: false
        )
        let initial = self.state(
            protectionEnabledForCurrentUrl: false,
            pausedUrls: [pausedUrl.absoluteString]
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .tabContextUpdated(stats: TabStats(), context: context)
        )
        XCTAssertTrue(next.protectionEnabledForCurrentUrl)
        XCTAssertTrue(effects.isEmpty)
    }

    func testTabContextUpdatedKeepsDisabledStateForPausedUrl() {
        // Switching back to a tab whose URL is already in pausedUrls must keep protection disabled.
        let pausedUrl = Constants.siteAURL
        let context = Store.TabContext(
            windowToken: nil, url: pausedUrl, domain: pausedUrl.host!, isSystemPage: false
        )
        let initial = self.state(
            protectionEnabledForCurrentUrl: true,
            pausedUrls: [pausedUrl.absoluteString]
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .tabContextUpdated(stats: TabStats(), context: context)
        )
        XCTAssertFalse(next.protectionEnabledForCurrentUrl)
        XCTAssertTrue(effects.isEmpty)
    }

    func testTabContextUpdatedEnablesProtectionForSystemPage() {
        // System page has no URL — protection must appear enabled.
        let context = Store.TabContext.empty
        let initial = self.state(
            protectionEnabledForCurrentUrl: false,
            pausedUrls: [Constants.siteAURL.absoluteString]
        )
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .tabContextUpdated(stats: TabStats(), context: context)
        )
        XCTAssertTrue(next.protectionEnabledForCurrentUrl)
    }

    func testToolbarValidationResolvedDoesNotMutateState() {
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .toolbarValidationResolved(
                window: Constants.anyWindowToken,
                isOn: true,
                badgeText: ""
            )
        )
        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    // MARK: protectionForUrlToggled(false)

    func testProtectionForUrlToggledOffEmitsExpectedStateAndEffects() {
        let url = Constants.exampleURL
        var stats = TabStats()
        stats.adsBlocked = 5
        stats.trackersBlocked = 2
        stats.url = url.absoluteString

        let initial = self.state(
            tabStats: stats,
            tabContext: Store.TabContext(
                windowToken: nil, url: url, domain: url.host!, isSystemPage: false
            )
        )

        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .protectionForUrlToggled(false)
        )

        XCTAssertEqual(next.inFlight, .disabling)
        XCTAssertTrue(next.pausedUrls.contains(url.absoluteString))
        XCTAssertEqual(next.tabStats.adsBlocked, 0)
        XCTAssertEqual(next.tabStats.trackersBlocked, 0)
        XCTAssertFalse(next.protectionEnabledForCurrentUrl)
        XCTAssertEqual(
            effects,
            [
                .setFilteringStatusForUrl(url.absoluteString, enable: false),
                .sendTelemetry(.action(.protectionPopupClick, screen: .main)),
                .requestToolbarUpdate
            ]
        )
    }

    func testProtectionForUrlToggledOnRemovesFromPausedUrls() {
        let url = Constants.exampleURL
        let initial = self.state(
            tabContext: Store.TabContext(
                windowToken: nil, url: url, domain: url.host!, isSystemPage: false
            ),
            pausedUrls: [url.absoluteString]
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .protectionForUrlToggled(true)
        )
        XCTAssertEqual(next.inFlight, .enabling)
        XCTAssertFalse(next.pausedUrls.contains(url.absoluteString))
        XCTAssertTrue(next.protectionEnabledForCurrentUrl)
        XCTAssertEqual(
            effects,
            [
                .setFilteringStatusForUrl(url.absoluteString, enable: true),
                .sendTelemetry(.action(.protectionPopupClick, screen: .main)),
                .requestToolbarUpdate
            ]
        )
    }

    func testProtectionForUrlToggledIgnoredWhenTabContextHasNoUrl() {
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .protectionForUrlToggled(false)
        )
        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    // MARK: inFlight guard

    func testProtectionForUrlToggledIgnoredWhileTogglingProtection() {
        let url = Constants.exampleURL
        let initial = self.state(
            tabContext: Store.TabContext(
                windowToken: nil, url: url, domain: url.host!, isSystemPage: false
            ),
            inFlight: .enabling
        )

        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .protectionForUrlToggled(false)
        )

        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    // MARK: User actions — pauseTapped, fixItTapped, etc.

    func testPauseTappedEmitsSetProtectionStatusOff() {
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(state: initial, action: .pauseTapped)
        XCTAssertEqual(next.inFlight, .disabling)
        XCTAssertEqual(
            effects,
            [
                .setProtectionStatus(enable: false),
                .sendTelemetry(.action(.pauseProtectionPopupClick, screen: .main))
            ]
        )
    }

    func testPauseTappedIgnoredWhileInFlight() {
        let initial = self.state(inFlight: .disabling)
        let (next, effects) = PopupReducer.reduce(state: initial, action: .pauseTapped)
        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    func testFixItTappedEmitsOpenSafariSettings() {
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(state: initial, action: .fixItTapped)
        XCTAssertEqual(next.inFlight, .openingSettings)
        XCTAssertEqual(
            effects,
            [
                .openSettings(page: "safari_protection"),
                .sendTelemetry(.action(.fixItPopupClick, screen: .main))
            ]
        )
    }

    func testBlockElementTappedEmitsScriptDispatchAndTelemetry() {
        let initial = self.state(hasHealthCheckAttention: true)
        let (next, effects) = PopupReducer.reduce(state: initial, action: .blockElementTapped)
        XCTAssertEqual(next, initial)
        XCTAssertEqual(
            effects,
            [
                .dispatchPageScriptMessage(name: "blockElementPing"),
                .sendTelemetry(.action(.blockElementPopupClick, screen: .healthCheckAttention))
            ]
        )
    }

    func testReportIssueTappedEmitsReportSiteEffectAndTelemetry() {
        let url = Constants.exampleURL
        let initial = self.state(
            tabContext: Store.TabContext(
                windowToken: nil, url: url, domain: url.host!, isSystemPage: false
            )
        )
        let (next, effects) = PopupReducer.reduce(state: initial, action: .reportIssueTapped)
        XCTAssertEqual(next.inFlight, .reporting)
        XCTAssertEqual(
            effects,
            [
                .reportSite(url: url.absoluteString),
                .sendTelemetry(.action(.reportIssueClick, screen: .main))
            ]
        )
    }

    func testRateTappedEmitsDismissAndOpenUrl() {
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(state: initial, action: .rateTapped)
        XCTAssertEqual(next, initial)
        XCTAssertEqual(effects.count, 3)
        XCTAssertEqual(effects[0], .dismissPopover)
        if case let .openUrlWithSystemHandler(url) = effects[1] {
            XCTAssertEqual(url.host, "link.adtidy.org")
        } else {
            XCTFail("Expected .openUrlWithSystemHandler as second effect, got \(effects[1])")
        }
        XCTAssertEqual(
            effects[2],
            .sendTelemetry(.action(.rateMiniPopupClick, screen: .main))
        )
    }

    func testSettingsTappedScreenIsProtectionDisabledWhenLayoutMatches() {
        let initial = self.state(protectionEnabled: false) // layout = .protectionIsDisabled
        let (next, effects) = PopupReducer.reduce(state: initial, action: .settingsTapped)
        XCTAssertEqual(next.inFlight, .openingSettings)
        XCTAssertEqual(
            effects,
            [
                .openSettings(),
                .sendTelemetry(.action(.settingPopupClick, screen: .protectionDisabled))
            ]
        )
    }

    func testSettingsTappedScreenFallsBackToMain() {
        let initial = self.state()
        let (_, effects) = PopupReducer.reduce(state: initial, action: .settingsTapped)
        XCTAssertEqual(
            effects,
            [
                .openSettings(),
                .sendTelemetry(.action(.settingPopupClick, screen: .main))
            ]
        )
    }

    // MARK: infoButtonTapped

    func testInfoButtonTappedOnDomainLayoutDoesNothing() {
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(state: initial, action: .infoButtonTapped)
        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    func testInfoButtonTappedOnAdguardNotLaunchedLaunchesApp() {
        let initial = self.state(mainAppRunning: false)
        let (next, effects) = PopupReducer.reduce(state: initial, action: .infoButtonTapped)
        XCTAssertEqual(next.inFlight, .launching)
        XCTAssertEqual(effects, [.launchMainApp])
    }

    func testInfoButtonTappedOnXpcUnavailableLaunchesApp() {
        let initial = self.state(xpcAvailable: false)
        let (next, effects) = PopupReducer.reduce(state: initial, action: .infoButtonTapped)
        XCTAssertEqual(next.inFlight, .launching)
        XCTAssertEqual(effects, [.launchMainApp])
    }

    func testInfoButtonTappedOnProtectionDisabledEnablesProtection() {
        let initial = self.state(protectionEnabled: false)
        let (next, effects) = PopupReducer.reduce(state: initial, action: .infoButtonTapped)
        XCTAssertEqual(next.inFlight, .enabling)
        XCTAssertEqual(effects, [.setProtectionStatus(enable: true)])
    }

    func testInfoButtonTappedOnSomethingWentWrongRestartsApp() {
        let initial = self.state(lastError: .launchFailed)
        let (next, effects) = PopupReducer.reduce(state: initial, action: .infoButtonTapped)
        XCTAssertEqual(next.inFlight, .restarting)
        XCTAssertEqual(effects, [.restartMainApp])
    }

    func testInfoButtonTappedOnOnboardingNotCompletedOpensSettings() {
        let initial = self.state(onboardingStatus: .notCompleted)
        let (next, effects) = PopupReducer.reduce(state: initial, action: .infoButtonTapped)
        XCTAssertEqual(next.inFlight, .openingSettings)
        XCTAssertEqual(
            effects,
            [
                .openSettings(),
                .sendTelemetry(.action(.settingPopupClick, screen: .main))
            ]
        )
    }

    // MARK: appStateChanged timestamp guard

    func testAppStateChangedIgnoredWhenTimestampIsStale() {
        let initial = self.state(
            protectionEnabled: false,
            lastAppStateTimestamp: Constants.knownTimestamp
        )
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: Constants.staleTimestamp,
            logLevel: Int32(LogLevel.verbose.rawValue),
            theme: Int32(Theme.system.rawValue)
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        // Protection and timestamp not updated for stale timestamp.
        XCTAssertFalse(next.protectionEnabled)
        XCTAssertEqual(next.lastAppStateTimestamp, Constants.knownTimestamp)
        // But logLevel and theme are always applied.
        XCTAssertEqual(effects, [.setLogLevel(.verbose), .setAppTheme(.system)])
    }

    func testAppStateChangedAcceptedWhenTimestampIsFresh() {
        let initial = self.state(
            protectionEnabled: false,
            lastAppStateTimestamp: Constants.knownTimestamp
        )
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: Constants.freshTimestamp,
            logLevel: Int32(LogLevel.debug.rawValue),
            theme: Int32(Theme.dark.rawValue)
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        XCTAssertTrue(next.protectionEnabled)
        XCTAssertEqual(next.lastAppStateTimestamp, Constants.freshTimestamp)
        XCTAssertTrue(effects.contains(.setAppTheme(.dark)))
    }

    func testAppStateRefreshSkippedDoesNotMutateState() {
        let initial = self.state(
            protectionEnabled: true,
            lastAppStateTimestamp: Constants.knownTimestamp
        )

        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .appStateRefreshSkipped(isXpcUnavailable: false)
        )

        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    func testAppStateRefreshSkippedLinkTimeoutSetsXpcUnavailable() {
        let initial = self.state(
            protectionEnabled: true,
            lastAppStateTimestamp: Constants.knownTimestamp
        )

        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .appStateRefreshSkipped(isXpcUnavailable: true)
        )

        XCTAssertFalse(next.xpcAvailable)
        XCTAssertTrue(effects.isEmpty)
    }

    // MARK: mainAppRunningChanged

    func testMainAppRunningChangedTrueEmitsRefreshEffects() {
        let initial = self.state(
            mainAppRunning: false
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .mainAppRunningChanged(true)
        )
        XCTAssertTrue(next.mainAppRunning)
        XCTAssertEqual(next.onboardingStatus, .unknown)
        XCTAssertEqual(effects, [.refreshAppState(), .refreshPrereqs(markStale: true, tabUrl: "")])
    }

    func testMainAppRunningChangedFalseClearsRunningFlag() {
        let initial = self.state(mainAppRunning: true)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .mainAppRunningChanged(false)
        )
        XCTAssertFalse(next.mainAppRunning)
        XCTAssertEqual(effects, RefreshPolicy.onMainAppStopped())
    }

    func testMainAppRunningChangedNoOpWhenValueIsSame() {
        let initial = self.state(mainAppRunning: true)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .mainAppRunningChanged(true)
        )
        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    func testMainAppRunningChangedTrueResetsXpcAvailable() {
        let initial = self.state(mainAppRunning: false, xpcAvailable: false)
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .mainAppRunningChanged(true)
        )
        XCTAssertTrue(next.xpcAvailable)
    }

    // MARK: XPC recovery via appStateChanged / prereqsRefreshed

    func testAppStateChangedResetsXpcAvailable() {
        let initial = self.state(xpcAvailable: false, lastAppStateTimestamp: 0)
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: 1,
            logLevel: 0,
            theme: 0
        )
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        XCTAssertTrue(next.xpcAvailable, "Successful appState must reset xpcAvailable")
    }

    func testPrereqsRefreshedResetsXpcAvailable() {
        let initial = self.state(xpcAvailable: false)
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: true,
                tabUrl: "",
                isFilteringEnabled: true
            )
        )
        XCTAssertTrue(next.xpcAvailable, "Successful prereqs must reset xpcAvailable")
    }

    // MARK: Toolbar

    func testToolbarValidationRequestedEmitsRefresh() {
        var stats = TabStats()
        stats.url = Constants.siteAURL.absoluteString
        let initial = self.state(tabStats: stats)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .toolbarValidationRequested(window: Constants.anyWindowToken)
        )
        XCTAssertEqual(next, initial)
        XCTAssertEqual(
            effects,
            [.refreshAppState(), .refreshPrereqs(markStale: false, tabUrl: Constants.siteAURL.absoluteString)]
        )
    }

    func testToolbarValidationRequestedEmitsRefreshForEmptyUrl() {
        var stats = TabStats()
        stats.url = ""
        let initial = self.state(tabStats: stats)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .toolbarValidationRequested(window: Constants.anyWindowToken)
        )
        XCTAssertEqual(
            effects,
            [.refreshAppState(), .refreshPrereqs(markStale: false, tabUrl: "")]
        )
    }

    // MARK: Error routing on .domain

    func testSetProtectionStatusFailureOnDomainLayoutResolvesToSomethingWentWrong() {
        let initial = self.state(inFlight: .enabling) // would-be .domain layout
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .setProtectionStatusCompleted(.failure(.protectionToggleFailed(domain: nil)))
        )
        XCTAssertNil(next.inFlight)
        XCTAssertEqual(next.lastError, .protectionToggleFailed(domain: nil))
        XCTAssertEqual(
            LayoutResolver.resolve(
                mainAppRunning: next.mainAppRunning,
                onboardingStatus: next.onboardingStatus,
                protectionEnabled: next.protectionEnabled,
                lastError: next.lastError
            ),
            .somethingWentWrong
        )
    }

    // MARK: Error routing on non-.domain

    func testSetProtectionStatusFailureOnProtectionDisabledLayoutKeepsLayout() {
        let initial = self.state(
            protectionEnabled: false,
            inFlight: .enabling
        )
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .setProtectionStatusCompleted(.failure(.protectionToggleFailed(domain: nil)))
        )
        XCTAssertNil(next.inFlight)
        XCTAssertNotNil(next.lastError)
        XCTAssertEqual(
            LayoutResolver.resolve(
                mainAppRunning: next.mainAppRunning,
                onboardingStatus: next.onboardingStatus,
                protectionEnabled: next.protectionEnabled,
                lastError: next.lastError
            ),
            .protectionIsDisabled
        )
    }

    // MARK: completions clear inFlight and last error on success

    func testSetProtectionStatusSuccessClearsInFlightAndError() {
        let initial = self.state(
            inFlight: .enabling,
            lastError: .launchFailed
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .setProtectionStatusCompleted(.success(Constants.knownTimestamp))
        )
        XCTAssertNil(next.inFlight)
        XCTAssertNil(next.lastError)
        XCTAssertEqual(effects, [.refreshAppState(after: Constants.knownTimestamp)])
    }

    func testSetFilteringStatusSuccessRequestsToolbarUpdate() {
        let initial = self.state(inFlight: .disabling)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .setFilteringStatusCompleted(.success(Constants.knownTimestamp))
        )
        XCTAssertNil(next.inFlight)
        XCTAssertEqual(effects, [.refreshAppState(after: Constants.knownTimestamp)])
    }

    func testSetFilteringStatusFailureSetsError() {
        let initial = self.state(inFlight: .disabling)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .setFilteringStatusCompleted(.failure(.filteringStateFetchFailed))
        )
        XCTAssertNil(next.inFlight)
        XCTAssertEqual(next.lastError, .filteringStateFetchFailed)
        XCTAssertTrue(effects.isEmpty)
    }

    func testReportSiteSuccessOpensUrlAndDismisses() {
        let initial = self.state(inFlight: .reporting)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .reportSiteCompleted(.success(Constants.exampleURL))
        )
        XCTAssertNil(next.inFlight)
        XCTAssertEqual(
            effects,
            [
                .openUrlInNewTab(Constants.exampleURL),
                .dismissPopover
            ]
        )
    }

    func testReportSiteFailureSetsError() {
        let initial = self.state(inFlight: .reporting)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .reportSiteCompleted(.failure(.reportFailed))
        )
        XCTAssertNil(next.inFlight)
        XCTAssertEqual(next.lastError, .reportFailed)
        XCTAssertTrue(effects.isEmpty)
    }

    func testLaunchMainAppFailureSetsLaunchError() {
        let initial = self.state(mainAppRunning: false, inFlight: .launching)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .launchMainAppCompleted(.launchFailed)
        )
        XCTAssertNil(next.inFlight)
        XCTAssertEqual(next.lastError, .launchFailed)
        XCTAssertTrue(effects.isEmpty)
    }

    func testLaunchMainAppSuccessClearsLastError() {
        let initial = self.state(inFlight: .launching, lastError: .launchFailed)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .launchMainAppCompleted(nil)
        )
        XCTAssertNil(next.inFlight)
        XCTAssertNil(next.lastError)
        XCTAssertTrue(effects.isEmpty)
    }

    func testRestartMainAppFailureSetsRestartError() {
        let initial = self.state(inFlight: .restarting)
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .restartMainAppCompleted(.restartFailed)
        )
        XCTAssertEqual(next.lastError, .restartFailed)
    }

    func testRestartMainAppSuccessClearsLastError() {
        let initial = self.state(inFlight: .restarting, lastError: .restartFailed)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .restartMainAppCompleted(nil)
        )
        XCTAssertNil(next.inFlight)
        XCTAssertNil(next.lastError)
        XCTAssertTrue(effects.isEmpty)
    }

    func testOpenSafariSettingsFailureSetsOpenSafariSettingsError() {
        let initial = self.state(inFlight: .openingSafariSettings)
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .openSafariSettingsCompleted(.openSafariSettingsFailed)
        )
        XCTAssertEqual(next.lastError, .openSafariSettingsFailed)
    }

    func testOpenSettingsFailureSetsOpenSettingsError() {
        let initial = self.state(inFlight: .openingSettings)
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .openSettingsCompleted(.openSettingsFailed)
        )
        XCTAssertEqual(next.lastError, .openSettingsFailed)
    }

    // MARK: prereqsRefreshed updates onboarding and extensions

    func testPrereqsRefreshedSetsOnboardingAndExtensions() {
        let initial = self.state(
            onboardingStatus: .completed
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: true,
                tabUrl: "",
                isFilteringEnabled: true
            )
        )
        XCTAssertEqual(next.onboardingStatus, .completed)
        // OnboardingStatus did not change → no toolbar update
        XCTAssertTrue(effects.isEmpty)
    }

    func testPrereqsRefreshedEmitsToolbarUpdateWhenOnboardingStatusChanges() {
        let url = Constants.siteAURL
        let initial = self.state(
            onboardingStatus: .unknown,
            tabContext: Store.TabContext(
                windowToken: nil, url: url, domain: url.host!, isSystemPage: false
            )
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: true,
                tabUrl: "",
                isFilteringEnabled: true
            )
        )
        XCTAssertEqual(next.onboardingStatus, .completed)
        XCTAssertEqual(effects, [.requestToolbarUpdate])
    }

    func testPrereqsRefreshedSetsOnboardingEvenWithoutContext() {
        let initial = self.state()
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: false,
                tabUrl: "",
                isFilteringEnabled: true
            )
        )
        XCTAssertEqual(next.onboardingStatus, .notCompleted)
    }

    // MARK: prereqsRefreshed syncs pausedUrls from main app

    func testPrereqsRefreshedAddsToPausedUrlsWhenFilteringDisabled() {
        // Simulates startup: pausedUrls is empty, but main app says URL is paused.
        let url = Constants.siteAURL
        let initial = self.state(
            tabContext: Store.TabContext(
                windowToken: nil, url: url, domain: url.host!, isSystemPage: false
            )
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: true,
                tabUrl: url.absoluteString,
                isFilteringEnabled: false
            )
        )
        XCTAssertTrue(next.pausedUrls.contains(url.absoluteString))
        XCTAssertFalse(next.protectionEnabledForCurrentUrl)
        XCTAssertEqual(effects, [.requestToolbarUpdate])
    }

    func testPrereqsRefreshedDoesNotRemoveFromPausedUrlsWhenFilteringDisabled() {
        // Server confirms filtering is still disabled — URL must stay in pausedUrls.
        let url = Constants.siteAURL
        let initial = self.state(
            protectionEnabledForCurrentUrl: false,
            tabContext: Store.TabContext(
                windowToken: nil, url: url, domain: url.host!, isSystemPage: false
            ),
            pausedUrls: [url.absoluteString]
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: true,
                tabUrl: url.absoluteString,
                isFilteringEnabled: false
            )
        )
        XCTAssertTrue(next.pausedUrls.contains(url.absoluteString), "URL must stay in pausedUrls")
        XCTAssertFalse(next.protectionEnabledForCurrentUrl, "Toggle must not flip to enabled")
        XCTAssertEqual(effects, [], "No toolbar update when no state change")
    }

    func testPrereqsRefreshedDoesNotEmitToolbarUpdateWhenFilteringStateUnchanged() {
        let url = Constants.siteAURL
        // URL is already in pausedUrls; main app confirms it's still paused.
        let initial = self.state(
            protectionEnabledForCurrentUrl: false,
            tabContext: Store.TabContext(
                windowToken: nil, url: url, domain: url.host!, isSystemPage: false
            ),
            pausedUrls: [url.absoluteString]
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: true,
                tabUrl: url.absoluteString,
                isFilteringEnabled: false
            )
        )
        XCTAssertTrue(next.pausedUrls.contains(url.absoluteString))
        XCTAssertTrue(effects.isEmpty)
    }

    func testPrereqsRefreshedIgnoresFilteringStateForEmptyUrl() {
        // Empty tabUrl (system page) — pausedUrls must not be modified.
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: true,
                tabUrl: "",
                isFilteringEnabled: false // should be ignored for empty URL
            )
        )
        XCTAssertTrue(next.pausedUrls.isEmpty)
        XCTAssertTrue(effects.isEmpty)
    }

    func testPrereqsRefreshedRemovesFromPausedUrlsWhenServerSaysEnabled() {
        // Bug fix: stale pausedUrls entry after allowlist-rule deletion in Settings.
        // Server reports isFilteringEnabled = true; the stale entry must be cleared.
        let url = Constants.siteAURL
        let initial = self.state(
            protectionEnabledForCurrentUrl: false,
            tabContext: Store.TabContext(
                windowToken: nil, url: url, domain: url.host!, isSystemPage: false
            ),
            pausedUrls: [url.absoluteString]
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: true,
                tabUrl: url.absoluteString,
                isFilteringEnabled: true
            )
        )
        XCTAssertFalse(next.pausedUrls.contains(url.absoluteString), "Stale entry must be removed")
        XCTAssertTrue(next.protectionEnabledForCurrentUrl, "Toggle must flip back to enabled")
        XCTAssertEqual(effects, [.requestToolbarUpdate])
    }

    func testPrereqsRefreshedDoesNotChangeProtectionWhenTabUrlDiffersFromActiveUrl() {
        // Race condition: prereqs response arrives for a stale URL that doesn't
        // Match the currently active tab. protectionEnabledForCurrentUrl must not change.
        let activeUrl = Constants.siteAURL
        let staleUrl = Constants.siteBURL
        let initial = self.state(
            protectionEnabledForCurrentUrl: true,
            tabContext: Store.TabContext(
                windowToken: nil, url: activeUrl, domain: activeUrl.host!, isSystemPage: false
            )
        )
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: true,
                tabUrl: staleUrl.absoluteString,
                isFilteringEnabled: false
            )
        )
        XCTAssertTrue(
            next.pausedUrls.contains(staleUrl.absoluteString),
            "Stale URL must still be added to pausedUrls"
        )
        XCTAssertTrue(
            next.protectionEnabledForCurrentUrl,
            "protectionEnabledForCurrentUrl must not change when tabUrl differs from active URL"
        )
    }

    func testPrereqsRefreshSkippedDoesNotMutateState() {
        let initial = self.state(
            onboardingStatus: .notCompleted,
            hasHealthCheckAttention: true,
            pausedUrls: [Constants.siteAURL.absoluteString]
        )

        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshSkipped(isXpcUnavailable: false)
        )

        XCTAssertEqual(next, initial, "State must not change")
        XCTAssertTrue(effects.isEmpty)
    }

    func testPrereqsRefreshSkippedLinkTimeoutSetsXpcUnavailable() {
        let initial = self.state(
            onboardingStatus: .completed,
            hasHealthCheckAttention: false
        )

        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshSkipped(isXpcUnavailable: true)
        )

        XCTAssertFalse(next.xpcAvailable)
        XCTAssertTrue(effects.isEmpty)
    }

    // MARK: prereqsRefreshed uses tabStats.url as fallback when tabContext.url is nil

    func testPrereqsRefreshedUpdatesProtectionWhenTabContextUrlNil() {
        // After Safari restart, tabContext.url can be nil
        // Because validateToolbarItem fires before the page finishes loading.
        // At that point page.properties().url has not resolved yet, but tabStats.url
        // Already has the destination URL from willNavigateTo/resetStats and must be
        // Used as a fallback so protectionEnabledForCurrentUrl is set correctly.
        let url = Constants.siteAURL
        let initial = self.state(
            // Stats URL set synchronously by resetStats/willNavigateTo
            tabStats: TabStats(url: url.absoluteString),
            // Context URL is nil — page still loading (race condition)
            tabContext: .empty
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: true,
                tabUrl: url.absoluteString,
                isFilteringEnabled: false
            )
        )
        XCTAssertTrue(next.pausedUrls.contains(url.absoluteString))
        XCTAssertFalse(
            next.protectionEnabledForCurrentUrl,
            "Protection must be shown as OFF when tabContext.url is nil but tabStats.url matches"
        )
        XCTAssertEqual(effects, [.requestToolbarUpdate])
    }

    // MARK: pageView session invariant

    func testPopupOpenedEmitsOnlyNotifyWindowOpened() {
        let initial = self.state() // .domain layout
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupOpened(openedAt: Constants.referenceDate)
        )
        XCTAssertEqual(effects, [.notifyWindowOpened])
    }

    func testPopupOpenedOnNonTelemetryLayoutEmitsOnlyNotifyWindowOpened() {
        let initial = self.state(mainAppRunning: false) // .adguardNotLaunched
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupOpened(openedAt: Constants.referenceDate)
        )
        XCTAssertEqual(effects, [.notifyWindowOpened])
    }

    // MARK: inFlight guards — non-toggle user actions

    func testFixItTappedIgnoredWhileInFlight() {
        let initial = self.state(inFlight: .openingSettings)
        let (next, effects) = PopupReducer.reduce(state: initial, action: .fixItTapped)
        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    func testReportIssueTappedIgnoredWhileInFlight() {
        let url = Constants.exampleURL
        let initial = self.state(
            tabContext: Store.TabContext(
                windowToken: nil, url: url, domain: url.host!, isSystemPage: false
            ),
            inFlight: .reporting
        )
        let (next, effects) = PopupReducer.reduce(state: initial, action: .reportIssueTapped)
        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    func testReportIssueTappedIgnoredWhenTabContextHasNoUrl() {
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(state: initial, action: .reportIssueTapped)
        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    func testSettingsTappedIgnoredWhileInFlight() {
        let initial = self.state(inFlight: .openingSettings)
        let (next, effects) = PopupReducer.reduce(state: initial, action: .settingsTapped)
        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    func testInfoButtonTappedIgnoredWhileInFlight() {
        let initial = self.state(mainAppRunning: false, inFlight: .launching)
        let (next, effects) = PopupReducer.reduce(state: initial, action: .infoButtonTapped)
        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    func testUpsellTappedEmitsOpenPurchaseAndDismissPopover() {
        let initial = self.state(isFreeUser: true)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .upsellTapped
        )
        XCTAssertEqual(next, initial, "State must not change on upsell tap")
        XCTAssertEqual(effects, [.openPurchase, .dismissPopover])
    }

    func testUpsellTappedIsBlockedWhenInFlight() {
        let initial = self.state(inFlight: .enabling)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .upsellTapped
        )
        XCTAssertEqual(next, initial)
        XCTAssertTrue(effects.isEmpty)
    }

    func testAppStateChangedPropagatesLicenseFields() {
        let initial = self.state(
            isFreeUser: true,
            isTrialAvailable: false,
            lastAppStateTimestamp: .zero
        )
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: Constants.freshTimestamp,
            logLevel: 0,
            theme: 0,
            isFreeUser: false,
            isTrialAvailable: true,
            trialDays: 7
        )
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        XCTAssertFalse(next.isFreeUser)
        XCTAssertTrue(next.isTrialAvailable)
        XCTAssertEqual(next.trialDays, 7)
    }

    // MARK: Telemetry screen — `.healthCheckAttention` branch of `mainOrHealthCheckAttention`

    func testProtectionForUrlToggledTelemetryUsesHealthCheckAttentionScreen() {
        let url = Constants.exampleURL
        let initial = self.state(
            hasHealthCheckAttention: true,
            tabContext: Store.TabContext(
                windowToken: nil, url: url, domain: url.host!, isSystemPage: false
            )
        )
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .protectionForUrlToggled(false)
        )
        XCTAssertEqual(
            effects,
            [
                .setFilteringStatusForUrl(url.absoluteString, enable: false),
                .sendTelemetry(.action(.protectionPopupClick, screen: .healthCheckAttention)),
                .requestToolbarUpdate
            ]
        )
    }

    func testPauseTappedTelemetryUsesHealthCheckAttentionScreen() {
        let initial = self.state(hasHealthCheckAttention: true)
        let (_, effects) = PopupReducer.reduce(state: initial, action: .pauseTapped)
        XCTAssertEqual(
            effects,
            [
                .setProtectionStatus(enable: false),
                .sendTelemetry(.action(.pauseProtectionPopupClick, screen: .healthCheckAttention))
            ]
        )
    }

    func testBlockElementTappedEmitsScriptDispatchAndTelemetryOnMain() {
        let initial = self.state() // hasHealthCheckAttention defaults to false → screen .main
        let (_, effects) = PopupReducer.reduce(state: initial, action: .blockElementTapped)
        XCTAssertEqual(
            effects,
            [
                .dispatchPageScriptMessage(name: "blockElementPing"),
                .sendTelemetry(.action(.blockElementPopupClick, screen: .main))
            ]
        )
    }

    // MARK: pageView screen mapping

    func testPopupOpenedOnProtectionDisabledLayoutEmitsOnlyNotifyWindowOpened() {
        let initial = self.state(protectionEnabled: false)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupOpened(openedAt: Constants.referenceDate)
        )
        XCTAssertEqual(effects, [.notifyWindowOpened])
    }

    func testPopupOpenedOnSomethingWentWrongLayoutEmitsOnlyNotifyWindowOpened() {
        let initial = self.state(lastError: .launchFailed)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupOpened(openedAt: Constants.referenceDate)
        )
        XCTAssertEqual(effects, [.notifyWindowOpened])
    }

    func testPopupOpenedOnOnboardingWasntCompletedEmitsOnlyNotifyWindowOpened() {
        let initial = self.state(onboardingStatus: .notCompleted)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupOpened(openedAt: Constants.referenceDate)
        )
        XCTAssertEqual(effects, [.notifyWindowOpened])
    }

    // MARK: popupReady — page-view telemetry after health check

    func testPopupReadyOnDomainLayoutEmitsMainPageView() {
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupReady(hasHealthCheckAttention: false)
        )
        XCTAssertFalse(next.hasHealthCheckAttention)
        XCTAssertEqual(effects, [.sendTelemetry(.pageView(.main))])
    }

    func testPopupReadyWithHealthCheckAttentionEmitsHealthCheckAttentionPageView() {
        let initial = self.state()
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupReady(hasHealthCheckAttention: true)
        )
        XCTAssertTrue(next.hasHealthCheckAttention)
        XCTAssertEqual(effects, [.sendTelemetry(.pageView(.healthCheckAttention))])
    }

    func testPopupReadyOnProtectionDisabledLayoutEmitsProtectionDisabledPageView() {
        let initial = self.state(protectionEnabled: false)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupReady(hasHealthCheckAttention: false)
        )
        XCTAssertEqual(effects, [.sendTelemetry(.pageView(.protectionDisabled))])
    }

    func testPopupReadyOnSomethingWentWrongLayoutEmitsFailedEnableProtectionPageView() {
        let initial = self.state(lastError: .launchFailed)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupReady(hasHealthCheckAttention: false)
        )
        XCTAssertEqual(effects, [.sendTelemetry(.pageView(.failedEnableProtection))])
    }

    func testPopupReadyOnNonTelemetryLayoutEmitsNoTelemetry() {
        let initial = self.state(onboardingStatus: .notCompleted)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupReady(hasHealthCheckAttention: false)
        )
        XCTAssertTrue(effects.isEmpty)
    }

    // MARK: appStateChanged — boundary and invalid-rawValue cases

    func testAppStateChangedIgnoredWhenTimestampIsEqual() {
        // Guard is strict `>`, so equal timestamp must be ignored.
        let initial = self.state(
            protectionEnabled: false,
            lastAppStateTimestamp: Constants.knownTimestamp
        )
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: Constants.knownTimestamp,
            logLevel: Int32(LogLevel.debug.rawValue),
            theme: Int32(Theme.dark.rawValue)
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        // Theme and logLevel still applied even when timestamp is not fresh.
        XCTAssertFalse(next.protectionEnabled)
        XCTAssertEqual(effects, [.setLogLevel(.debug), .setAppTheme(.dark)])
    }

    func testAppStateChangedIgnoresInvalidLogLevelAndTheme() {
        let initial = self.state(lastAppStateTimestamp: 0)
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: 1,
            logLevel: 99, // out of range for AML.LogLevel
            theme: 99     // out of range for Theme
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        XCTAssertEqual(next.lastAppStateTimestamp, 1)
        XCTAssertTrue(next.protectionEnabled)
        XCTAssertEqual(effects, [])
    }

    func testAppStateChangedEmitsLogLevelBeforeTheme() {
        // Lock in the contractual order. Log level must be set first,
        // Before the theme switch, which can trigger a UI repaint.
        let initial = self.state(lastAppStateTimestamp: 0)
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: 1,
            logLevel: Int32(LogLevel.debug.rawValue),
            theme: Int32(Theme.dark.rawValue)
        )
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        XCTAssertEqual(effects, [.setLogLevel(.debug), .setAppTheme(.dark)])
    }

    // MARK: appStateChanged — requestToolbarUpdate on protection change

    func testAppStateChangedEmitsToolbarUpdateWhenProtectionChanges() {
        let initial = self.state(protectionEnabled: false, lastAppStateTimestamp: 0)
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: 1,
            logLevel: 0,
            theme: 0
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        XCTAssertTrue(next.protectionEnabled)
        XCTAssertTrue(effects.contains(.requestToolbarUpdate))
    }

    func testAppStateChangedSkipsToolbarUpdateWhenProtectionUnchanged() {
        let initial = self.state(protectionEnabled: true, lastAppStateTimestamp: 0)
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: 1,
            logLevel: 0,
            theme: 0
        )
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        XCTAssertFalse(effects.contains(.requestToolbarUpdate))
    }

    // MARK: setFilteringStatus success clears prior error

    func testSetFilteringStatusSuccessClearsLastError() {
        let initial = self.state(inFlight: .disabling, lastError: .filteringStateFetchFailed)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .setFilteringStatusCompleted(.success(Constants.knownTimestamp))
        )
        XCTAssertNil(next.inFlight)
        XCTAssertNil(next.lastError)
        XCTAssertEqual(effects, [.refreshAppState(after: Constants.knownTimestamp)])
    }

    // MARK: mainAppRunningChanged — true->false preserves cache

    func testMainAppRunningChangedTrueToFalseDoesNotResetOnboarding() {
        let initial = self.state(
            mainAppRunning: true,
            onboardingStatus: .completed
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .mainAppRunningChanged(false)
        )
        XCTAssertFalse(next.mainAppRunning)
        XCTAssertEqual(next.onboardingStatus, .completed)
        XCTAssertEqual(effects, [.requestToolbarUpdate])
    }

    // MARK: setProtectionStatusCompleted failure emits telemetry

    func testSetProtectionStatusFailureEmitsTelemetry() {
        let initial = self.state(inFlight: .enabling)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .setProtectionStatusCompleted(.failure(.protectionToggleFailed(domain: nil)))
        )
        XCTAssertTrue(
            effects.contains(.sendTelemetry(.pageView(.failedEnableProtection))),
            "Failure must emit failedEnableProtection telemetry"
        )
    }

    // MARK: fixIt/settings dismiss moved to completion

    func testFixItTappedDoesNotEmitDismissPopover() {
        let initial = self.state()
        let (_, effects) = PopupReducer.reduce(state: initial, action: .fixItTapped)
        XCTAssertFalse(
            effects.contains(.dismissPopover),
            "fixItTapped must not dismiss upfront — dismissal is in completion"
        )
    }

    func testSettingsTappedDoesNotEmitDismissPopover() {
        let initial = self.state()
        let (_, effects) = PopupReducer.reduce(state: initial, action: .settingsTapped)
        XCTAssertFalse(
            effects.contains(.dismissPopover),
            "settingsTapped must not dismiss upfront — dismissal is in completion"
        )
    }

    func testOpenSafariSettingsCompletedSuccessEmitsDismiss() {
        let initial = self.state(inFlight: .openingSafariSettings)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .openSafariSettingsCompleted(nil)
        )
        XCTAssertEqual(effects, [.dismissPopover])
    }

    func testOpenSafariSettingsCompletedFailureDoesNotDismiss() {
        let initial = self.state(inFlight: .openingSafariSettings)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .openSafariSettingsCompleted(.openSafariSettingsFailed)
        )
        XCTAssertFalse(effects.contains(.dismissPopover))
        XCTAssertEqual(next.lastError, .openSafariSettingsFailed)
    }

    func testOpenSettingsCompletedSuccessEmitsDismiss() {
        let initial = self.state(inFlight: .openingSettings)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .openSettingsCompleted(nil)
        )
        XCTAssertEqual(effects, [.dismissPopover])
    }

    func testOpenSettingsCompletedFailureDoesNotDismiss() {
        let initial = self.state(inFlight: .openingSettings)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .openSettingsCompleted(.openSettingsFailed)
        )
        XCTAssertFalse(effects.contains(.dismissPopover))
        XCTAssertEqual(next.lastError, .openSettingsFailed)
    }

    // MARK: mainAppRunningChanged(true) and appStateChanged clear lastError

    func testMainAppRunningTrueClearsLastError() {
        let initial = self.state(mainAppRunning: false, lastError: .launchFailed)
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .mainAppRunningChanged(true)
        )
        XCTAssertNil(next.lastError, "mainAppRunningChanged(true) must clear lastError")
    }

    func testAppStateChangedClearsLastError() {
        let initial = self.state(
            lastError: .launchFailed,
            lastAppStateTimestamp: 0
        )
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: 1,
            logLevel: 0,
            theme: 0
        )
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        XCTAssertNil(next.lastError, "appStateChanged with fresh timestamp must clear lastError")
        XCTAssertTrue(
            effects.contains(.requestToolbarUpdate),
            "Clearing lastError (hadError) must trigger toolbar update even without protection change"
        )
    }

    // MARK: rateTapped uses openUrlWithSystemHandler

    func testRateTappedUsesSystemHandler() {
        let initial = self.state()
        let (_, effects) = PopupReducer.reduce(state: initial, action: .rateTapped)
        let hasSystemHandler = effects.contains { effect in
            if case .openUrlWithSystemHandler = effect { return true }
            return false
        }
        XCTAssertTrue(hasSystemHandler, "rateTapped must use openUrlWithSystemHandler, not openUrlInNewTab")
    }

    // MARK: blockElementCompleted

    func testBlockElementCompletedWithPageFoundEmitsDismissOnly() {
        let initial = self.state()
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .blockElementCompleted(pageFound: true)
        )
        XCTAssertEqual(effects, [.dismissPopover])
    }

    func testBlockElementCompletedNoPageEmitsNothing() {
        let initial = self.state()
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .blockElementCompleted(pageFound: false)
        )
        XCTAssertTrue(effects.isEmpty)
    }

    // MARK: reportSiteCompleted does not re-emit telemetry

    func testReportSiteCompletedSuccessDoesNotEmitTelemetry() {
        let initial = self.state(inFlight: .reporting)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .reportSiteCompleted(.success(Constants.exampleURL))
        )
        let hasTelemetry = effects.contains { if case .sendTelemetry = $0 { return true }; return false }
        XCTAssertFalse(hasTelemetry, "completion must not re-emit telemetry")
    }

    // MARK: appStateChanged applies theme/logLevel even for stale timestamp

    func testAppStateChangedAppliesThemeForStaleTimestamp() {
        let initial = self.state(lastAppStateTimestamp: Constants.knownTimestamp)
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: Constants.staleTimestamp,
            logLevel: Int32(LogLevel.debug.rawValue),
            theme: Int32(Theme.dark.rawValue)
        )
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        XCTAssertTrue(
            effects.contains(.setLogLevel(.debug)),
            "logLevel must be applied even with stale timestamp"
        )
        XCTAssertTrue(
            effects.contains(.setAppTheme(.dark)),
            "theme must be applied even with stale timestamp"
        )
    }

    func testAppStateChangedDoesNotUpdateProtectionForStaleTimestamp() {
        let initial = self.state(
            protectionEnabled: false,
            lastAppStateTimestamp: Constants.knownTimestamp
        )
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: true,
            lastCheckTime: Constants.staleTimestamp,
            logLevel: 0,
            theme: 0
        )
        let (next, _) = PopupReducer.reduce(
            state: initial,
            action: .appStateChanged(snapshot)
        )
        XCTAssertFalse(
            next.protectionEnabled,
            "protectionEnabled must not change for stale timestamp"
        )
    }

    // MARK: prereqsRefreshed emits toolbar update on layout change

    func testPrereqsRefreshedEmitsToolbarUpdateOnLayoutChange() {
        // Onboarding status change triggers a layout change and toolbar update.
        let initial = self.state(onboardingStatus: .completed)
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .prereqsRefreshed(
                onboardingCompleted: false,
                tabUrl: "",
                isFilteringEnabled: true
            )
        )
        XCTAssertTrue(
            effects.contains(.requestToolbarUpdate),
            "prereqsRefreshed must emit toolbar update when layout changes"
        )
    }

    // MARK: healthCheckRefreshed

    func testHealthCheckRefreshedSetsAttention() {
        let initial = self.state(hasHealthCheckAttention: false)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .healthCheckRefreshed(hasAttention: true)
        )
        XCTAssertTrue(next.hasHealthCheckAttention)
        XCTAssertTrue(effects.isEmpty)
    }

    func testHealthCheckRefreshedClearsAttention() {
        let initial = self.state(hasHealthCheckAttention: true)
        let (next, effects) = PopupReducer.reduce(
            state: initial,
            action: .healthCheckRefreshed(hasAttention: false)
        )
        XCTAssertFalse(next.hasHealthCheckAttention)
        XCTAssertTrue(effects.isEmpty)
    }

    // MARK: popupWillShow triggers popup preparation

    func testPopupWillShowTriggersPreparePopup() {
        let initial = self.state(
            mainAppRunning: true,
            tabContext: Store.TabContext(
                windowToken: nil,
                url: Constants.exampleURL,
                domain: "example.com",
                isSystemPage: false
            )
        )
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupWillShow
        )
        XCTAssertEqual(effects, [.preparePopup])
    }

    func testPopupOpenedDoesNotTriggerHealthCheckOrPreparePopup() {
        let initial = self.state(
            mainAppRunning: true,
            tabContext: Store.TabContext(
                windowToken: nil,
                url: Constants.exampleURL,
                domain: "example.com",
                isSystemPage: false
            )
        )
        let (_, effects) = PopupReducer.reduce(
            state: initial,
            action: .popupOpened(openedAt: Constants.referenceDate)
        )
        XCTAssertFalse(
            effects.contains(.preparePopup),
            "popupOpened must not trigger preparePopup — popupWillShow already did it"
        )
        XCTAssertFalse(
            effects.contains(.refreshHealthCheck),
            "popupOpened must not trigger health check — popupWillShow already did it"
        )
    }
}
