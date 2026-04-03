// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  StatisticsService.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - StatisticsService

protocol StatisticsService {
    func addBlockCounts(_ counts: [SafariBlockerType: Int])
    func addAdsBlockedTotal(_ count: Int)
    func getStatistics(for period: StatisticsPeriod, blockerType: SafariBlockerType?) -> Int
    func getAdsBlockedTotal(for period: StatisticsPeriod) -> Int
    func resetStatistics()
}

extension StatisticsService {
    func getStatistics(for period: StatisticsPeriod) -> Int {
        self.getStatistics(for: period, blockerType: nil)
    }
}

// MARK: - NoOpStatisticsService

final class NoOpStatisticsService: StatisticsService {
    func addBlockCounts(_ counts: [SafariBlockerType: Int]) {
        // No-op: statistics unavailable
    }

    func addAdsBlockedTotal(_ count: Int) {
        // No-op: statistics unavailable
    }

    func getStatistics(for period: StatisticsPeriod, blockerType: SafariBlockerType?) -> Int {
        0
    }

    func getAdsBlockedTotal(for period: StatisticsPeriod) -> Int {
        0
    }

    func resetStatistics() {
        // No-op: statistics unavailable
    }
}

// MARK: - StatisticsServiceImpl

final class StatisticsServiceImpl: StatisticsService {
    // MARK: Private properties

    private let store: StatisticsStore

    // MARK: Init

    init(store: StatisticsStore) {
        self.store = store
    }

    // MARK: Public methods

    func addBlockCounts(_ counts: [SafariBlockerType: Int]) {
        do {
            try self.store.addCounts(counts)
        } catch {
            let countsDesc = counts.map { "\($0.key)=\($0.value)" }.joined(separator: ", ")
            LogError("Failed to add block counts [\(countsDesc)]: \(error)")
        }
    }

    func addAdsBlockedTotal(_ count: Int) {
        guard count > 0 else { return }
        do {
            try self.store.addAdsBlockedTotal(count)
        } catch {
            LogError("Failed to add ads-blocked total \(count): \(error)")
        }
    }

    func getStatistics(for period: StatisticsPeriod, blockerType: SafariBlockerType?) -> Int {
        do {
            return try self.store.queryStatistics(for: period, blockerType: blockerType)
        } catch {
            let blockerTypeDesc = blockerType.map { "blocker=\($0)" } ?? "all blockers"
            LogError("Failed to query statistics for period=\(period.displayName), \(blockerTypeDesc): \(error)")
            return 0
        }
    }

    func getAdsBlockedTotal(for period: StatisticsPeriod) -> Int {
        do {
            return try self.store.queryAdsBlockedTotal(for: period)
        } catch {
            LogError("Failed to query ads-blocked total for period=\(period.displayName): \(error)")
            return 0
        }
    }

    func resetStatistics() {
        do {
            try self.store.resetAll()
        } catch {
            LogError("Failed to reset statistics: \(error)")
        }
    }
}
