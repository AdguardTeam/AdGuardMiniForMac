// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  RefreshPolicy.swift
//  PopupExtension
//

import Foundation

/// Single place that decides **when** and **what** to refresh from the main app via XPC.
///
/// The reducer delegates all refresh decisions here instead of inlining
/// effect lists. Every trigger (toolbar validation, app launch, user
/// action completion, popup open) has a dedicated entry point.
///
/// All functions are pure.
enum RefreshPolicy {
    /// Toolbar validation — fires on every tab switch.
    /// Per-URL protection status is already computed locally from `pausedUrls`
    /// in `handleTabContextUpdated`; XPC refresh here is a consistency check.
    static func onToolbarValidation(state: Store.State) -> [Store.Effect] {
        // Skip the prereqs read while a protection toggle is in flight.
        // Reading now can observe the allow list before the write commits.
        if state.isProtectionToggleInFlight {
            return [.refreshAppState()]
        }
        return [.refreshAppState(), .refreshPrereqs(markStale: false, tabUrl: state.tabStats.url)]
    }

    /// Main app just started — full refresh, state may be completely stale.
    static func onMainAppStarted(state: Store.State) -> [Store.Effect] {
        [.refreshAppState(), .refreshPrereqs(markStale: true, tabUrl: state.tabStats.url)]
    }

    /// User action completed successfully — confirm the result from the main app.
    static func onUserActionCompleted(timestamp: EBATimestamp) -> [Store.Effect] {
        [.refreshAppState(after: timestamp)]
    }

    /// Main app stopped — XPC is unavailable; update the toolbar icon only.
    static func onMainAppStopped() -> [Store.Effect] {
        [.requestToolbarUpdate]
    }

    /// Per-URL protection toggled — state is already updated optimistically;
    /// tell Safari to re-render the toolbar icon immediately.
    static func onUrlProtectionToggled() -> [Store.Effect] {
        [.requestToolbarUpdate]
    }
}
