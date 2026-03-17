// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  StatisticsServiceTests.swift
//  AdguardMiniTests
//

import XCTest

final class StatisticsServiceTests: XCTestCase {
    func testAddBlockCounts_DelegatesToStore() {
        let mockStore = MockStatisticsStore.MockType.success(queryResult: 0).createObject()
        let service = StatisticsServiceImpl(store: mockStore)

        service.addBlockCounts([.general: 10])

        XCTAssertEqual(mockStore.addCountsCalls.count, 1)
        XCTAssertEqual(mockStore.addCountsCalls[0][.general], 10)
    }

    func testGetStatistics_DelegatesToStore() {
        let mockStore = MockStatisticsStore.MockType.success(queryResult: 42).createObject()
        let service = StatisticsServiceImpl(store: mockStore)

        let result = service.getStatistics(for: .day)

        XCTAssertEqual(result, 42)
        XCTAssertEqual(mockStore.queryStatisticsCalls.count, 1)
        XCTAssertEqual(mockStore.queryStatisticsCalls[0].period, .day)
        XCTAssertNil(mockStore.queryStatisticsCalls[0].blockerType)
    }

    func testGetStatistics_WithBlockerType_DelegatesToStore() {
        let mockStore = MockStatisticsStore.MockType.success(queryResult: 42).createObject()
        let service = StatisticsServiceImpl(store: mockStore)

        let result = service.getStatistics(for: .week, blockerType: .privacy)

        XCTAssertEqual(result, 42)
        XCTAssertEqual(mockStore.queryStatisticsCalls.count, 1)
        XCTAssertEqual(mockStore.queryStatisticsCalls[0].period, .week)
        XCTAssertEqual(mockStore.queryStatisticsCalls[0].blockerType, .privacy)
    }

    func testAddBlockCounts_StoreThrows_DoesNotCrash() {
        let mockStore = MockStatisticsStore.MockType.throwOnAdd.createObject()
        let service = StatisticsServiceImpl(store: mockStore)

        service.addBlockCounts([.general: 10])

        XCTAssertEqual(mockStore.addCountsCalls.count, 1)
    }

    func testGetStatistics_StoreThrows_ReturnsZero() {
        let mockStore = MockStatisticsStore.MockType.throwOnQuery.createObject()
        let service = StatisticsServiceImpl(store: mockStore)

        let result = service.getStatistics(for: .day)

        XCTAssertEqual(result, 0)
        XCTAssertEqual(mockStore.queryStatisticsCalls.count, 1)
    }

    func testResetStatistics_DelegatesToStore() {
        let mockStore = MockStatisticsStore.MockType.success(queryResult: 0).createObject()
        let service = StatisticsServiceImpl(store: mockStore)

        service.resetStatistics()

        XCTAssertEqual(mockStore.resetAllCalls, 1)
    }

    func testResetStatistics_StoreThrows_DoesNotCrash() {
        let mockStore = MockStatisticsStore.MockType.throwOnReset.createObject()
        let service = StatisticsServiceImpl(store: mockStore)

        service.resetStatistics()

        XCTAssertEqual(mockStore.resetAllCalls, 1)
    }

    func testNoOpStatisticsService_AllMethods_DoNotCrash() {
        let service = NoOpStatisticsService()

        service.addBlockCounts([.general: 10])
        let result = service.getStatistics(for: .day)
        service.resetStatistics()

        XCTAssertEqual(result, 0)
    }
}
