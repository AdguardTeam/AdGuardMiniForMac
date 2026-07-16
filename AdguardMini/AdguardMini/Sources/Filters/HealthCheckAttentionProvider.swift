// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  HealthCheckAttentionProvider.swift
//  AdguardMini
//

import Foundation

// MARK: - Constants

private enum Constants {
    static let noUpdatesThreshold: TimeInterval = 7.days
    static let brokenStatuses: Set<SafariExtension.Status> = [.unknown, .converterError, .safariError]
}

// MARK: - HealthCheckDismissId

/// Identifiers for dismissible health check cards.
///
/// Raw values must match `HealthCheckDismissId` enum in the TypeScript UI layer (`HealthCheck/components/HealthCheckDismissId.ts`).
enum HealthCheckDismissId: String {
    case noUpdates
    case adBlockingDisabled
    case annoyanceBlockingDisabled
}

// MARK: - HealthCheckAttentionProvider

/// Computes the aggregated health check attention flag (P1–P7).
///
/// Returns `true` if at least one health check condition is active.
/// Respects dismiss state for dismissible cards (P5–P7).
protocol HealthCheckAttentionProvider {
    func hasAttention() async -> Bool
    /// Returns `true` when the login item / background helper is NOT enabled.
    func hasLoginItemDisabled() -> Bool
}

// MARK: - HealthCheckAttentionProviderImpl

/// Aggregates P1–P7 health check conditions into a single boolean flag.
///
/// Conditions:
/// - P1: Not all Safari extensions are enabled (disabled in Safari prefs)
/// - P2: Login item not enabled (background helper for XPC and launch at login)
/// - P3: Extensions in error state (unknown, converterError, safariError)
/// - P4: Rules limit exceeded in any extension
/// - P5: No filter updates for more than 7 days (dismissible)
/// - P6: Ad blocking group — not all recommended filters enabled (dismissible)
/// - P7: All annoyance filters disabled (dismissible)
final class HealthCheckAttentionProviderImpl: HealthCheckAttentionProvider {
    private let safariExtensionStatusManager: SafariExtensionStatusManager
    private let safariExtensionStateService: SafariExtensionStateService
    private let loginItemManager: LoginItemManager
    private let userSettingsService: UserSettingsService
    private let filtersSupervisor: FiltersSupervisor

    init(
        safariExtensionStatusManager: SafariExtensionStatusManager,
        safariExtensionStateService: SafariExtensionStateService,
        loginItemManager: LoginItemManager,
        userSettingsService: UserSettingsService,
        filtersSupervisor: FiltersSupervisor
    ) {
        self.safariExtensionStatusManager = safariExtensionStatusManager
        self.safariExtensionStateService = safariExtensionStateService
        self.loginItemManager = loginItemManager
        self.userSettingsService = userSettingsService
        self.filtersSupervisor = filtersSupervisor
    }

    func hasAttention() async -> Bool {
        // P1
        if await self.hasExtensionsDisabled() { return true }
        // P2
        if self.hasLoginItemDisabled() { return true }

        let statuses = await self.safariExtensionStateService.getAllExtensionsStatus().allStatuses
        // P3
        if self.hasExtensionsBroken(statuses: statuses) { return true }
        // P4
        if self.hasRulesLimitExceeded(statuses: statuses) { return true }

        let dismissedCards = Set(self.userSettingsService.dismissedHealthCheckCards)
        // P5
        if self.hasNoRecentUpdates(dismissedCards: dismissedCards) { return true }

        // P6 & P7
        return await self.hasFilterIssues(dismissedCards: dismissedCards)
    }

    /// P2: Login item not enabled (background helper for XPC and launch at login).
    func hasLoginItemDisabled() -> Bool {
        self.loginItemManager.checkHelperStatus() != .enabled
    }
}

// MARK: - Individual Health Checks

private extension HealthCheckAttentionProviderImpl {
    /// P1: Not all Safari extensions are enabled.
    func hasExtensionsDisabled() async -> Bool {
        await !self.safariExtensionStatusManager.isAllExtensionsEnabled
    }

    /// P3: Extensions in error state (unknown, converterError, safariError).
    func hasExtensionsBroken(statuses: [SafariExtension.Status]) -> Bool {
        statuses.contains { Constants.brokenStatuses.contains($0) }
    }

    /// P4: Rules limit exceeded in any extension.
    func hasRulesLimitExceeded(statuses: [SafariExtension.Status]) -> Bool {
        statuses.contains(.limitExceeded)
    }

    /// P5: No filter updates for more than 7 days (dismissible).
    func hasNoRecentUpdates(dismissedCards: Set<String>) -> Bool {
        guard !dismissedCards.contains(HealthCheckDismissId.noUpdates.rawValue) else { return false }
        let elapsed = Date.now.timeIntervalSince(self.userSettingsService.lastFiltersUpdateTime)
        return elapsed > Constants.noUpdatesThreshold
    }

    /// P6 & P7: Filter-based checks (dismissible).
    ///
    /// Fetches filters data only if at least one of P6/P7 is not dismissed.
    func hasFilterIssues(dismissedCards: Set<String>) async -> Bool {
        let needsP6 = !dismissedCards.contains(HealthCheckDismissId.adBlockingDisabled.rawValue)
        let needsP7 = !dismissedCards.contains(HealthCheckDismissId.annoyanceBlockingDisabled.rawValue)
        guard needsP6 || needsP7 else { return false }

        let index = await self.filtersSupervisor.getFiltersIndex()
        let enabledIds = Set(await self.filtersSupervisor.getEnabledFilterIds())

        if needsP6, !self.isAdBlockingEnabled(index: index, enabledIds: enabledIds) {
            return true
        }
        if needsP7, self.isAllAnnoyanceBlockingDisabled(index: index, enabledIds: enabledIds) {
            return true
        }
        return false
    }

    /// P6: Checks if all recommended filters in the ad-blocking group are enabled.
    func isAdBlockingEnabled(index: FiltersIndex, enabledIds: Set<Int>) -> Bool {
        let adBlockingGroupId = index.definedGroups.adBlocking
        guard let recommendedIds = index.recommendedFiltersIdsByGroupDict[adBlockingGroupId],
              !recommendedIds.isEmpty
        else {
            return true
        }
        return recommendedIds.allSatisfy { enabledIds.contains($0) }
    }

    /// P7: Checks if ALL annoyance-related filters are disabled.
    /// Returns `true` only if none of the annoyance filters are enabled
    /// and social widgets are not fully enabled.
    func isAllAnnoyanceBlockingDisabled(index: FiltersIndex, enabledIds: Set<Int>) -> Bool {
        let annoyanceFilterIds = [
            index.cookieNoticeFilterId,
            index.popUpsFilterId,
            index.widgetsFilterId,
            index.otherAnnoyanceFilterId
        ]
        // Also check social widgets group (same logic as TS blockSocialButtons)
        let socialGroupId = index.definedGroups.socialWidgets
        let socialRecommended = index.recommendedFiltersIdsByGroupDict[socialGroupId] ?? []

        // Social buttons: all recommended in socialWidgets group must be enabled
        let hasSocialEnabled = !socialRecommended.isEmpty
            && socialRecommended.allSatisfy { enabledIds.contains($0) }
        if hasSocialEnabled { return false }

        // Any annoyance filter enabled?
        if annoyanceFilterIds.contains(where: { enabledIds.contains($0) }) {
            return false
        }

        return true
    }
}
