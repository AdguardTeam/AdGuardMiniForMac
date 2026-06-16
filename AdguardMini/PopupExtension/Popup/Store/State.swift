// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  State.swift
//  PopupExtension
//

import Foundation

extension Store {
    /// Single source of truth for the popup. Pure value type,
    /// owns no references. Mutated only by the reducer.
    struct State: Equatable {
        var mainAppRunning: Bool
        var onboardingStatus: OnboardingStatus
        var protectionEnabled: Bool
        var protectionEnabledForCurrentUrl: Bool
        var hasHealthCheckAttention: Bool
        var xpcAvailable: Bool
        var isFreeUser: Bool
        var isTrialAvailable: Bool
        var trialDays: Int

        var tabStats: TabStats
        var tabContext: TabContext

        var pausedUrls: Set<String>

        var inFlight: InFlightAction?
        var lastError: Store.Error?

        var lastAppStateTimestamp: EBATimestamp

        static let initial = State(
            mainAppRunning: false,
            onboardingStatus: .unknown,
            protectionEnabled: false,
            protectionEnabledForCurrentUrl: true,
            hasHealthCheckAttention: false,
            xpcAvailable: true,
            isFreeUser: true,
            isTrialAvailable: false,
            trialDays: 0,
            tabStats: TabStats(),
            tabContext: .empty,
            pausedUrls: [],
            inFlight: nil,
            lastError: nil,
            lastAppStateTimestamp: .zero
        )
    }
}
