// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MockStatisticsStore.swift
//  AdguardMiniTests
//

import Foundation

enum MockStatisticsStoreError: Error {
    case addCountsFailed
    case queryFailed
    case resetFailed
}

extension MockStatisticsStore {
    struct Configuration {
        let shouldThrowOnAdd: Bool
        let shouldThrowOnQuery: Bool
        let shouldThrowOnReset: Bool
        let queryResult: Int

        init(
            shouldThrowOnAdd: Bool = false,
            shouldThrowOnQuery: Bool = false,
            shouldThrowOnReset: Bool = false,
            queryResult: Int = 0
        ) {
            self.shouldThrowOnAdd = shouldThrowOnAdd
            self.shouldThrowOnQuery = shouldThrowOnQuery
            self.shouldThrowOnReset = shouldThrowOnReset
            self.queryResult = queryResult
        }
    }

    enum MockType {
        case success(queryResult: Int)
        case throwOnAdd
        case throwOnQuery
        case throwOnReset

        private func createConfiguration() -> Configuration {
            switch self {
            case .success(let queryResult):
                Configuration(queryResult: queryResult)
            case .throwOnAdd:
                Configuration(shouldThrowOnAdd: true)
            case .throwOnQuery:
                Configuration(shouldThrowOnQuery: true)
            case .throwOnReset:
                Configuration(shouldThrowOnReset: true)
            }
        }

        func createObject() -> MockStatisticsStore {
            MockStatisticsStore(configuration: self.createConfiguration())
        }
    }
}

final class MockStatisticsStore: StatisticsStore {
    private let configuration: Configuration
    private(set) var addCountsCalls: [[SafariBlockerType: Int]] = []
    private(set) var addAdsBlockedTotalCalls: [Int] = []
    private(set) var queryStatisticsCalls: [(period: StatisticsPeriod, blockerType: SafariBlockerType?)] = []
    private(set) var queryAdsBlockedTotalCalls: [StatisticsPeriod] = []
    private(set) var resetAllCalls: Int = 0

    init(configuration: Configuration) {
        self.configuration = configuration
    }

    func addCounts(_ counts: [SafariBlockerType: Int]) throws {
        self.addCountsCalls.append(counts)
        if self.configuration.shouldThrowOnAdd {
            throw MockStatisticsStoreError.addCountsFailed
        }
    }

    func addAdsBlockedTotal(_ count: Int) throws {
        self.addAdsBlockedTotalCalls.append(count)
        if self.configuration.shouldThrowOnAdd {
            throw MockStatisticsStoreError.addCountsFailed
        }
    }

    func queryStatistics(for period: StatisticsPeriod, blockerType: SafariBlockerType?) throws -> Int {
        self.queryStatisticsCalls.append((period, blockerType))
        if self.configuration.shouldThrowOnQuery {
            throw MockStatisticsStoreError.queryFailed
        }
        return self.configuration.queryResult
    }

    func queryAdsBlockedTotal(for period: StatisticsPeriod) throws -> Int {
        self.queryAdsBlockedTotalCalls.append(period)
        if self.configuration.shouldThrowOnQuery {
            throw MockStatisticsStoreError.queryFailed
        }
        return self.configuration.queryResult
    }

    func resetAll() throws {
        self.resetAllCalls += 1
        if self.configuration.shouldThrowOnReset {
            throw MockStatisticsStoreError.resetFailed
        }
    }
}
