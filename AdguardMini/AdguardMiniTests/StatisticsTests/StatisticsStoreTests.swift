// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  StatisticsStoreTests.swift
//  AdguardMiniTests
//

import XCTest
import CoreData

final class StatisticsStoreTests: XCTestCase {
    private func createInMemoryStore() throws -> StatisticsStoreImpl {
        let bundle = Bundle(for: type(of: self))
        guard let modelURL = bundle.url(forResource: "BlockingStatistics", withExtension: "momd"),
              let model = NSManagedObjectModel(contentsOf: modelURL)
        else {
            throw NSError(domain: "StatisticsStoreTests", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Failed to load BlockingStatistics model from bundle: \(bundle.bundlePath)"
            ])
        }

        let container = NSPersistentContainer(name: "BlockingStatistics", managedObjectModel: model)
        let description = NSPersistentStoreDescription()
        description.type = NSInMemoryStoreType
        container.persistentStoreDescriptions = [description]

        var loadError: Error?
        container.loadPersistentStores { _, error in
            loadError = error
        }

        if let error = loadError {
            throw error
        }

        return StatisticsStoreImpl(persistentContainer: container)
    }

    func testAddCounts_CreatesNewRecord() throws {
        let store = try createInMemoryStore()

        try store.addCounts([.general: 10])

        let result = try store.queryStatistics(for: .day, blockerType: .general)
        XCTAssertEqual(result, 10)
    }

    func testAddCounts_AccumulatesExistingRecord() throws {
        let store = try createInMemoryStore()

        try store.addCounts([.general: 10])
        try store.addCounts([.general: 5])

        let result = try store.queryStatistics(for: .day, blockerType: .general)
        XCTAssertEqual(result, 15)
    }

    func testAddCounts_MultipleBlockerTypes() throws {
        let store = try createInMemoryStore()

        try store.addCounts([.general: 10, .privacy: 20])

        let generalResult = try store.queryStatistics(for: .day, blockerType: .general)
        let privacyResult = try store.queryStatistics(for: .day, blockerType: .privacy)

        XCTAssertEqual(generalResult, 10)
        XCTAssertEqual(privacyResult, 20)
    }

    func testQueryStatistics_AggregatesAllBlockerTypes() throws {
        let store = try createInMemoryStore()

        try store.addCounts([.general: 10, .privacy: 20])

        let result = try store.queryStatistics(for: .day)

        XCTAssertEqual(result, 30)
    }

    func testQueryStatistics_EmptyStore_ReturnsZero() throws {
        let store = try createInMemoryStore()

        let result = try store.queryStatistics(for: .day)

        XCTAssertEqual(result, 0)
    }

    func testAddCounts_IgnoresZeroValues() throws {
        let store = try createInMemoryStore()

        try store.addCounts([.general: 0, .privacy: 5])

        let generalResult = try store.queryStatistics(for: .day, blockerType: .general)
        let privacyResult = try store.queryStatistics(for: .day, blockerType: .privacy)

        XCTAssertEqual(generalResult, 0)
        XCTAssertEqual(privacyResult, 5)
    }

    func testAddCounts_EmptyDictionary_DoesNotCrash() throws {
        let store = try createInMemoryStore()

        try store.addCounts([:])

        let result = try store.queryStatistics(for: .day)
        XCTAssertEqual(result, 0)
    }

    func testQueryStatistics_FiltersByBlockerType() throws {
        let store = try createInMemoryStore()

        try store.addCounts([.general: 10, .privacy: 20, .security: 30])

        let generalResult = try store.queryStatistics(for: .day, blockerType: .general)
        let privacyResult = try store.queryStatistics(for: .day, blockerType: .privacy)
        let securityResult = try store.queryStatistics(for: .day, blockerType: .security)

        XCTAssertEqual(generalResult, 10)
        XCTAssertEqual(privacyResult, 20)
        XCTAssertEqual(securityResult, 30)
    }

    // MARK: - Ads blocked total tests

    func testAddAdsBlockedTotal_CreatesNewRecord() throws {
        let store = try createInMemoryStore()

        try store.addAdsBlockedTotal(5)

        let result = try store.queryAdsBlockedTotal(for: .day)
        XCTAssertEqual(result, 5)
    }

    func testAddAdsBlockedTotal_AccumulatesExistingRecord() throws {
        let store = try createInMemoryStore()

        try store.addAdsBlockedTotal(5)
        try store.addAdsBlockedTotal(3)

        let result = try store.queryAdsBlockedTotal(for: .day)
        XCTAssertEqual(result, 8)
    }

    func testQueryAdsBlockedTotal_ReturnsOnlyReservedRecords() throws {
        let store = try createInMemoryStore()

        try store.addCounts([.general: 10, .privacy: 20])
        try store.addAdsBlockedTotal(7)

        let adsBlockedResult = try store.queryAdsBlockedTotal(for: .day)
        XCTAssertEqual(adsBlockedResult, 7, "Ads-blocked total should only return reserved records")
    }

    func testPerBlockerQuery_DoesNotIncludeAdsBlockedTotalRecords() throws {
        let store = try createInMemoryStore()

        try store.addCounts([.general: 10, .privacy: 20])
        try store.addAdsBlockedTotal(7)

        let generalResult = try store.queryStatistics(for: .day, blockerType: .general)
        let privacyResult = try store.queryStatistics(for: .day, blockerType: .privacy)

        XCTAssertEqual(generalResult, 10)
        XCTAssertEqual(privacyResult, 20)
    }

    func testAggregateQuery_ExcludesAdsBlockedTotalRecords() throws {
        let store = try createInMemoryStore()

        try store.addCounts([.general: 10, .privacy: 20])
        try store.addAdsBlockedTotal(7)

        // Aggregate query (nil blockerType) should only sum actual blocker rows.
        let allResult = try store.queryStatistics(for: .day)
        XCTAssertEqual(allResult, 30, "Aggregate query should sum per-blocker records only")
    }

    func testAdsBlockedTotalStorageKey_DoesNotOverlapWithBlockerTypes() {
        XCTAssertFalse(
            SafariBlockerType.allCases.contains { $0.rawValue == BlockingStatisticsKey.adsBlockedTotal },
            "Reserved ads-blocked total key must not overlap with SafariBlockerType.rawValue"
        )
    }
}
