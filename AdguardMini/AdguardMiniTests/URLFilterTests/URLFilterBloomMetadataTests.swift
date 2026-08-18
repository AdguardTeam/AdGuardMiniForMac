// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterBloomMetadataTests.swift
//  AdguardMiniTests
//

import XCTest

final class URLFilterBloomMetadataTests: XCTestCase {
    private var suiteName: String!
    private var userDefaults: UserDefaults!

    override func setUp() {
        super.setUp()
        self.suiteName = "URLFilterBloomMetadataTests.\(UUID().uuidString)"
        self.userDefaults = UserDefaults(suiteName: self.suiteName)!
    }

    override func tearDown() {
        self.userDefaults.removePersistentDomain(forName: self.suiteName)
        self.userDefaults = nil
        self.suiteName = nil
        super.tearDown()
    }

    func testRoundTrip() {
        let storage = URLFilterBloomMetadataStorageImpl(userDefaults: self.userDefaults)
        let metadata = URLFilterBloomMetadata(
            rulesCount: 181_379,
            timeUpdated: Date(timeIntervalSince1970: 1_786_395_773),
            tag: "d88aef318f28"
        )

        storage.save(metadata)
        let loaded = storage.load()

        XCTAssertEqual(loaded, metadata)
        XCTAssertEqual(loaded?.rulesCount, 181_379)
        XCTAssertEqual(loaded?.timeUpdated, Date(timeIntervalSince1970: 1_786_395_773))
        XCTAssertEqual(loaded?.tag, "d88aef318f28")
    }

    func testLoadReturnsNilWhenNoMetadataPersisted() {
        let storage = URLFilterBloomMetadataStorageImpl(userDefaults: self.userDefaults)

        XCTAssertNil(storage.load())
    }

    func testLoadReturnsNilWhenMetadataIsIncomplete() {
        let storage = URLFilterBloomMetadataStorageImpl(userDefaults: self.userDefaults)
        self.userDefaults.set(
            Data(#"{"rulesCount":181379}"#.utf8),
            forKey: URLFilterBloomMetadataStorageImpl.Keys.metadata
        )

        XCTAssertNil(storage.load())
    }

    func testLoadReturnsNilWhenValuesAreCorrupted() {
        let storage = URLFilterBloomMetadataStorageImpl(userDefaults: self.userDefaults)
        self.userDefaults.set(
            Data("not a json".utf8),
            forKey: URLFilterBloomMetadataStorageImpl.Keys.metadata
        )

        XCTAssertNil(storage.load())
    }

    func testLoadReturnsNilWhenValuesAreNotPositive() {
        let storage = URLFilterBloomMetadataStorageImpl(userDefaults: self.userDefaults)
        storage.save(
            URLFilterBloomMetadata(
                rulesCount: 0,
                timeUpdated: Date(timeIntervalSince1970: 0),
                tag: "tag"
            )
        )

        XCTAssertNil(storage.load())
    }
}
