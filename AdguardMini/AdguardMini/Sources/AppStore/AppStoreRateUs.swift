// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStoreRateUs.swift
//  AdguardMini
//

import Foundation
import StoreKit
import SwiftUI
import AML

// MARK: - AppStoreRateUs

protocol AppStoreRateUs {
    /// Notifies the rate-us controller that the settings window was opened.
    ///
    /// The review prompt is shown only after a debounce delay and only if the
    /// `isWindowVisible` closure still reports the window as visible and the
    /// app as active.
    /// - Parameter isWindowVisible: A main-actor closure returning `true` when the
    ///   settings window is still open and the app is in the foreground.
    func onWindowOpened(isWindowVisible: @escaping @MainActor () -> Bool)
}

// MARK: - Constants

private enum Constants {
    /// Minimum number of blocked ad requests required before the review prompt can be shown.
    static let minBlockedAdsCount = 300

    /// Delay in seconds between opening the settings window and showing the review prompt.
    static let debounceDelay: TimeInterval = 7
}

// MARK: - ReviewRequester

private final class ReviewRequester {
    static let shared = ReviewRequester()

    @available(macOS 13.0, *)
    @MainActor
    func requestReview() {
        guard let window = NSApplication.shared.windows.first else {
            LogWarn("Review request skipped: no windows")
            return
        }

        let vc = self.ensureContentViewController(for: window)
        LogInfo("Requesting App Store review")
        AppStore.requestReview(in: vc)
    }

    @MainActor
    private func ensureContentViewController(for window: NSWindow) -> NSViewController {
        if let existing = window.contentViewController {
            LogDebug("Using existing window.contentViewController: \(type(of: existing)).")
            return existing
        }

        let wrapper = NSViewController()
        wrapper.view = window.contentView ?? NSView()

        window.contentViewController = wrapper
        LogInfo("Installed wrapper NSViewController as window.contentViewController")
        return wrapper
    }
}

// MARK: - AppStoreRateUsImpl

final class AppStoreRateUsImpl: AppStoreRateUs {
    private let appMetadata: AppMetadata
    private let statisticsService: StatisticsService
    private var debounceTask: Task<Void, Never>?

    /// Creates a new rate-us controller.
    /// - Parameters:
    ///   - appMetadata: Provides the current rate-us stage and the last no-crashes date.
    ///   - statisticsService: Provides filtering statistics used for the activity threshold.
    init(appMetadata: AppMetadata, statisticsService: StatisticsService) {
        self.appMetadata = appMetadata
        self.statisticsService = statisticsService
    }

    func onWindowOpened(isWindowVisible: @escaping @MainActor () -> Bool) {
        guard self.canShowRateUs() else {
            return
        }

        self.debounceTask?.cancel()
        self.debounceTask = Task { @MainActor in
            try? await Task.sleep(seconds: Constants.debounceDelay)

            guard !Task.isCancelled else {
                LogDebug("Rate us request cancelled by debouncer")
                return
            }

            guard isWindowVisible() else {
                LogDebug("Rate us request skipped: window is not visible or app is not active")
                return
            }

            self.callRateUs()
            self.advanceToNextStage()
        }
    }

    private func canShowRateUs() -> Bool {
        guard let noCrashesDate = self.appMetadata.rateUsNoCrashesDate else {
            LogDebug("Rate us check skipped: missing noCrashesDate")
            return false
        }

        let blockedAdsCount = self.statisticsService.getAdsBlockedTotal(for: .all)
        guard blockedAdsCount >= Constants.minBlockedAdsCount else {
            LogDebug(
                "Rate us check skipped: blocked ads \(blockedAdsCount) is less than \(Constants.minBlockedAdsCount)"
            )
            return false
        }

        let currentStage = self.appMetadata.rateUsStage
        let elapsed = Date.now.timeIntervalSince(noCrashesDate)

        let canShow = elapsed >= currentStage.interval

        if canShow {
            LogInfo("Rate us conditions met: stage=\(currentStage), elapsed=\(elapsed.fullHours)h")
        } else {
            LogDebug("Rate us conditions not met: stage=\(currentStage), elapsed=\(elapsed.fullHours)h, required=\(currentStage.interval.fullHours)h")
        }

        return canShow
    }

    private func advanceToNextStage() {
        let currentStage = self.appMetadata.rateUsStage
        self.appMetadata.rateUsStage = currentStage.next
        self.appMetadata.rateUsNoCrashesDate = .now
        LogInfo("Rate us stage advanced: \(currentStage) → \(currentStage.next)")
    }

    @MainActor
    private func callRateUs() {
        if #available(macOS 13.0, *) {
            LogInfo("Call rate us")
            ReviewRequester.shared.requestReview()
        } else {
            LogInfo("Call legacy rate us")
            SKStoreReviewController.requestReview()
        }
    }
}

private extension TimeInterval {
    var fullHours: Int {
        Int(self / 1.hour)
    }
}
