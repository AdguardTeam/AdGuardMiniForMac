// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ToolbarRendererLogic.swift
//  PopupExtension
//

import Foundation

// MARK: - ToolbarRendererLogic

/// Pure computation that derives the toolbar icon and badge state from the
/// store and tab statistics, independent of the Safari toolbar UI.
enum ToolbarRendererLogic {
    struct RenderResult: Equatable {
        let isOn: Bool
        let badgeText: String
    }

    static func compute(
        state: Store.State,
        tabStats: TabStats,
        showBadge: Bool
    ) -> RenderResult {
        let ready = state.mainAppRunning
            && state.xpcAvailable
            && state.onboardingStatus != .notCompleted
            && state.protectionEnabled

        // Derive protection state from `pausedUrls` using the live `tabStats.url`,
        // `tabContext.url` is stale after a tab switch until `tabContextUpdated` fires.
        // Avoids incorrectly showing "on" for a paused site during the lag.
        let isProtectedForUrl = tabStats.url.isEmpty
            || !state.pausedUrls.contains(tabStats.url)

        let isOn = ready && isProtectedForUrl

        let badgeText = isOn && showBadge
            ? tabStats.badgeText
            : ""

        return RenderResult(isOn: isOn, badgeText: badgeText)
    }

    static func computeBadge(
        state: Store.State,
        tabStats: TabStats,
        showBadge: Bool
    ) -> String {
        compute(state: state, tabStats: tabStats, showBadge: showBadge).badgeText
    }
}
