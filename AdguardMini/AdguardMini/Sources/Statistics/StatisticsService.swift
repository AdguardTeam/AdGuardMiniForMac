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
    func getStatistics(for period: StatisticsPeriod, blockerType: SafariBlockerType?) -> Int
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

    func getStatistics(for period: StatisticsPeriod, blockerType: SafariBlockerType?) -> Int {
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
            LogError("Failed to add block counts: \(error)")
        }
    }

    func getStatistics(for period: StatisticsPeriod, blockerType: SafariBlockerType?) -> Int {
        do {
            return try self.store.queryStatistics(for: period, blockerType: blockerType)
        } catch {
            LogError("Failed to query statistics: \(error)")
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
