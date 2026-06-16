// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ToolbarRendererTests.swift
//  AdguardMiniTests
//

import XCTest
import SafariServices

// MARK: - Constants

private enum Constants {
    static let exampleUrl = URL(string: "https://example.com")!
    static let otherUrl = URL(string: "https://other.com")!
    static let windowToken = Store.SafariWindowToken(rawValue: 1)
}

// MARK: - ToolbarRendererTests

final class ToolbarRendererTests: XCTestCase {
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

    // MARK: Domain layout, stats (5, 2) -> badge "7"

    func testDomainLayoutReturnsBadgeWithTotal() {
        let url = Constants.exampleUrl
        let sut = self.state(
            tabContext: Store.TabContext(
                windowToken: Constants.windowToken,
                url: url,
                domain: url.host!,
                isSystemPage: false
            )
        )
        let stats = TabStats(
            adsBlocked: 5,
            trackersBlocked: 2,
            url: url.absoluteString
        )
        let badge = ToolbarRendererLogic.computeBadge(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertEqual(badge, "7")
    }

    // MARK: adguardNotLaunched -> empty badge

    func testAdguardNotLaunchedReturnsEmptyBadge() {
        let sut = self.state(mainAppRunning: false)
        let stats = TabStats(adsBlocked: 10, trackersBlocked: 5, url: Constants.exampleUrl.absoluteString)
        let badge = ToolbarRendererLogic.computeBadge(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertEqual(badge, "")
    }

    // MARK: Protection disabled globally -> empty badge

    func testProtectionDisabledReturnsEmptyBadge() {
        let sut = self.state(protectionEnabled: false)
        let stats = TabStats(adsBlocked: 3, trackersBlocked: 1, url: Constants.exampleUrl.absoluteString)
        let badge = ToolbarRendererLogic.computeBadge(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertEqual(badge, "")
    }

    // MARK: Onboarding not completed -> empty badge

    func testOnboardingNotCompletedReturnsEmptyBadge() {
        let sut = self.state(onboardingStatus: .notCompleted)
        let stats = TabStats(adsBlocked: 3, trackersBlocked: 1, url: Constants.exampleUrl.absoluteString)
        let badge = ToolbarRendererLogic.computeBadge(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertEqual(badge, "")
    }

    // MARK: Onboarding unknown -> badge shown (optimistic, same as .completed)

    func testOnboardingUnknownShowsBadgeOptimistically() {
        let sut = self.state(onboardingStatus: .unknown)
        let stats = TabStats(adsBlocked: 3, trackersBlocked: 1, url: Constants.exampleUrl.absoluteString)
        let badge = ToolbarRendererLogic.computeBadge(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertEqual(badge, "4")
    }

    // MARK: Paused URL -> empty badge

    func testPausedUrlReturnsEmptyBadge() {
        let sut = self.state(pausedUrls: [Constants.exampleUrl.absoluteString])
        let stats = TabStats(adsBlocked: 5, trackersBlocked: 2, url: Constants.exampleUrl.absoluteString)
        let badge = ToolbarRendererLogic.computeBadge(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertEqual(badge, "")
    }

    // MARK: showBadge = false -> empty badge

    func testShowBadgeFalseReturnsEmptyBadge() {
        let url = Constants.exampleUrl
        let sut = self.state(
            tabContext: Store.TabContext(
                windowToken: Constants.windowToken,
                url: url,
                domain: url.host!,
                isSystemPage: false
            )
        )
        let stats = TabStats(adsBlocked: 5, trackersBlocked: 2, url: url.absoluteString)
        let badge = ToolbarRendererLogic.computeBadge(
            state: sut, tabStats: stats, showBadge: false
        )
        XCTAssertEqual(badge, "")
    }

    // MARK: URL mismatch, tab URL not in pausedUrls -> badge shown

    func testUrlMismatchWithUnpausedTabUrlShowsBadge() {
        // `state.tabContext.url` is "other.com" (stale, from a previous tab);
        // `tabStats.url` is "example.com" (current tab, NOT in pausedUrls).
        // Protection must be considered on → badge is shown.
        let staleContextUrl = Constants.otherUrl
        let sut = self.state(
            tabContext: Store.TabContext(
                windowToken: Constants.windowToken,
                url: staleContextUrl,
                domain: staleContextUrl.host!,
                isSystemPage: false
            )
            // `exampleUrl` NOT in `pausedUrls` (default: empty set)
        )
        let stats = TabStats(adsBlocked: 3, trackersBlocked: 1, url: Constants.exampleUrl.absoluteString)
        let badge = ToolbarRendererLogic.computeBadge(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertEqual(badge, "4")
    }

    // MARK: URL mismatch, tab URL IS paused -> icon off, empty badge (regression)

    func testUrlMismatchWithPausedTabUrl_IsOnFalse() {
        // Regression: when switching back to a tab whose URL is in `pausedUrls`,
        // `state.tabContext.url` may still be stale (not yet updated via `tabContextUpdated`).
        // The toolbar icon must show "off" regardless.
        let staleContextUrl = Constants.otherUrl
        let sut = self.state(
            tabContext: Store.TabContext(
                windowToken: Constants.windowToken,
                url: staleContextUrl,
                domain: staleContextUrl.host!,
                isSystemPage: false
            ),
            pausedUrls: [Constants.exampleUrl.absoluteString]
        )
        let stats = TabStats(
            adsBlocked: 5,
            trackersBlocked: 2,
            url: Constants.exampleUrl.absoluteString
        )
        let result = ToolbarRendererLogic.compute(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertFalse(
            result.isOn,
            "Icon must be off when tab URL is paused, even if context URL hasn't been updated yet"
        )
        XCTAssertEqual(result.badgeText, "")
    }

    // MARK: Empty tabStats.url -> url mismatch -> empty badge

    func testEmptyTabStatsUrlReturnsEmptyBadge() {
        let sut = self.state()
        let stats = TabStats(adsBlocked: 0, trackersBlocked: 0, url: "")
        let badge = ToolbarRendererLogic.computeBadge(
            state: sut, tabStats: stats, showBadge: true
        )
        // Empty URL -> url mismatch -> isProtectedForUrl = true -> isOn = true
        // But badgeText for 0 total is "" (from TabStats.badgeText)
        XCTAssertEqual(badge, "")
    }

    // MARK: Zero stats -> empty badge (badgeText is "")

    func testZeroStatsReturnsEmptyBadge() {
        let url = Constants.exampleUrl
        let sut = self.state(
            tabContext: Store.TabContext(
                windowToken: Constants.windowToken,
                url: url,
                domain: url.host!,
                isSystemPage: false
            )
        )
        let stats = TabStats(adsBlocked: 0, trackersBlocked: 0, url: url.absoluteString)
        let badge = ToolbarRendererLogic.computeBadge(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertEqual(badge, "")
    }

    // MARK: Protection disabled for URL (matching) -> empty badge

    func testProtectionDisabledForUrlReturnsEmptyBadge() {
        let url = Constants.exampleUrl
        let sut = self.state(
            protectionEnabledForCurrentUrl: false,
            tabContext: Store.TabContext(
                windowToken: Constants.windowToken,
                url: url,
                domain: url.host!,
                isSystemPage: false
            ),
            pausedUrls: [url.absoluteString]
        )
        let stats = TabStats(adsBlocked: 5, trackersBlocked: 2, url: url.absoluteString)
        let badge = ToolbarRendererLogic.computeBadge(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertEqual(badge, "")
    }

    // MARK: isOn assertions

    func testDomainLayoutIsOnTrue() {
        let url = Constants.exampleUrl
        let sut = self.state(
            tabContext: Store.TabContext(
                windowToken: Constants.windowToken,
                url: url,
                domain: url.host!,
                isSystemPage: false
            )
        )
        let stats = TabStats(adsBlocked: 1, trackersBlocked: 0, url: url.absoluteString)
        let result = ToolbarRendererLogic.compute(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertTrue(result.isOn)
    }

    func testAdguardNotLaunchedIsOnFalse() {
        let sut = self.state(mainAppRunning: false)
        let stats = TabStats(adsBlocked: 1, trackersBlocked: 0, url: Constants.exampleUrl.absoluteString)
        let result = ToolbarRendererLogic.compute(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertFalse(result.isOn)
    }

    // MARK: First-launch stale → fresh state re-render

    /// Covers the two-phase render in SafariExtensionHandler.validateToolbarItem:
    /// the first render uses a stale snapshot (XPC not yet answered) and the
    /// second render — executed after the async XPC refresh — uses the fresh state.
    /// Both renders call ToolbarRendererLogic.compute; only the second produces isOn = true.
    func testStaleStateThenFreshStateIsOnFlipsToTrue() {
        let url = Constants.exampleUrl
        let stats = TabStats(
            adsBlocked: 3,
            trackersBlocked: 1,
            url: url.absoluteString
        )
        let tabContext = Store.TabContext(
            windowToken: Constants.windowToken,
            url: url,
            domain: url.host!,
            isSystemPage: false
        )

        // Stale: XPC has not responded yet; protectionEnabled defaults to false.
        // The icon is off because protection is disabled, not because of .unknown
        // Onboarding status (.unknown is now treated optimistically).
        let staleState = self.state(
            onboardingStatus: .unknown,
            protectionEnabled: false,
            tabContext: tabContext
        )
        let staleResult = ToolbarRendererLogic.compute(
            state: staleState, tabStats: stats, showBadge: true
        )
        XCTAssertFalse(staleResult.isOn, "Icon must be off when protectionEnabled is false")

        // Fresh: XPC answered; all components of 'ready' are now true.
        let freshState = self.state(
            onboardingStatus: .completed,
            protectionEnabled: true,
            tabContext: tabContext
        )
        let freshResult = ToolbarRendererLogic.compute(
            state: freshState, tabStats: stats, showBadge: true
        )
        XCTAssertTrue(freshResult.isOn, "Icon must be on after XPC refresh")
    }

    // MARK: XPC unavailable -> toolbar OFF, empty badge

    func testXpcUnavailableReturnsToolbarOff() {
        let sut = self.state(xpcAvailable: false)
        let stats = TabStats(adsBlocked: 10, trackersBlocked: 5, url: Constants.exampleUrl.absoluteString)
        let result = ToolbarRendererLogic.compute(
            state: sut, tabStats: stats, showBadge: true
        )
        XCTAssertFalse(result.isOn, "Toolbar must be OFF when XPC is unavailable")
        XCTAssertEqual(result.badgeText, "", "Badge must be empty when XPC is unavailable")
    }
}
