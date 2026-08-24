// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PathGrantStoreTests.swift
//  AdguardMiniTests
//

import XCTest

final class PathGrantStoreTests: XCTestCase {
    func testGrantAndIsGranted() {
        let store = PathGrantStore(capacity: 3)
        store.grant("/Users/test/Documents/rules.txt")
        XCTAssertTrue(store.isGranted("/Users/test/Documents/rules.txt"))
        XCTAssertFalse(store.isGranted("/Users/test/Documents/other.txt"))
    }

    func testReGrant_DedupesAndMovesToFront() {
        let store = PathGrantStore(capacity: 2)
        store.grant("/a")
        store.grant("/b")
        store.grant("/a")
        XCTAssertTrue(store.isGranted("/a"))
        XCTAssertTrue(store.isGranted("/b"))
        // Third distinct grant should evict least-recent path.
        store.grant("/c")
        XCTAssertFalse(store.isGranted("/b"))
        XCTAssertTrue(store.isGranted("/a"))
        XCTAssertTrue(store.isGranted("/c"))
    }

    func testClear() {
        let store = PathGrantStore(capacity: 3)
        store.grant("/a")
        store.clear()
        XCTAssertFalse(store.isGranted("/a"))
    }
}
