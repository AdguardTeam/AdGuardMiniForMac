// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SharedStatisticsStoreTests.swift
//  AdguardMiniTests
//

import XCTest
import CoreData

final class SharedStatisticsStoreTests: XCTestCase {
    private var temporaryStoreURLs: [URL] = []

    override func tearDownWithError() throws {
        for url in self.temporaryStoreURLs {
            try? FileManager.default.removeItem(at: url)
            try? FileManager.default.removeItem(at: url.appendingPathExtension("shm"))
            try? FileManager.default.removeItem(at: url.appendingPathExtension("wal"))
        }
        self.temporaryStoreURLs.removeAll()
    }

    /// Creates a SQLite-backed instance in a temporary location. SQLite is used
    /// rather than an in-memory store because `NSBatchDeleteRequest` (used by
    /// `resetAll`) is not supported by the in-memory store type.
    private func createStore() throws -> SharedStatisticsStoreImpl {
        let bundle = Bundle(for: type(of: self))
        guard let modelURL = bundle.url(forResource: "BlockingStatistics", withExtension: "momd"),
              let model = NSManagedObjectModel(contentsOf: modelURL)
        else {
            throw NSError(domain: "SharedStatisticsStoreTests", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Failed to load BlockingStatistics model"
            ])
        }

        let storeURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("BlockingStatisticsTest-\(UUID().uuidString).sqlite")
        self.temporaryStoreURLs.append(storeURL)

        let container = NSPersistentContainer(name: "BlockingStatistics", managedObjectModel: model)
        let description = NSPersistentStoreDescription(url: storeURL)
        container.persistentStoreDescriptions = [description]

        var loadError: Error?
        container.loadPersistentStores { _, error in
            loadError = error
        }
        if let error = loadError { throw error }

        return SharedStatisticsStoreImpl(persistentContainer: container)
    }

    func testAddCounts_CreatesNewRecord() throws {
        let store = try createStore()
        try store.addCounts([.general: 10])
        let result = try store.queryStatistics(for: .day, blockerType: .general)
        XCTAssertEqual(result, 10)
    }

    func testAddCounts_AccumulatesExistingRecord() throws {
        let store = try createStore()
        try store.addCounts([.general: 10])
        try store.addCounts([.general: 5])
        let result = try store.queryStatistics(for: .day, blockerType: .general)
        XCTAssertEqual(result, 15)
    }

    func testResetAll_ClearsAllRecords() throws {
        let store = try createStore()
        try store.addCounts([.general: 10, .privacy: 20])
        try store.addAdsBlockedTotal(5)
        try store.resetAll()
        XCTAssertEqual(try store.queryStatistics(for: .all), 0)
        XCTAssertEqual(try store.queryAdsBlockedTotal(for: .all), 0)
    }

    func testResetAll_EmptyStore_DoesNotCrash() throws {
        let store = try createStore()
        try store.resetAll()
        XCTAssertEqual(try store.queryStatistics(for: .all), 0)
    }

    func testAddAdsBlockedTotal_AccumulatesCorrectly() throws {
        let store = try createStore()
        try store.addAdsBlockedTotal(5)
        try store.addAdsBlockedTotal(3)
        let result = try store.queryAdsBlockedTotal(for: .day)
        XCTAssertEqual(result, 8)
    }

    func testQueryStatistics_AggregatesAllBlockerTypes() throws {
        let store = try createStore()
        try store.addCounts([.general: 10, .privacy: 20])
        let result = try store.queryStatistics(for: .day)
        XCTAssertEqual(result, 30)
    }

    func testQueryStatistics_ExcludesAdsBlockedTotal() throws {
        let store = try createStore()
        try store.addCounts([.general: 10])
        try store.addAdsBlockedTotal(999)
        // Aggregate query must not include the adsBlockedTotal sentinel row
        let result = try store.queryStatistics(for: .day)
        XCTAssertEqual(result, 10)
    }
}
