// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PathConfinerTests.swift
//  AdguardMiniTests
//

import XCTest

final class PathConfinerTests: XCTestCase {
    private let roots = ["/Users/test/Library/Containers/com.adguard.mini"]

    func testPickerGrantedPath_IsConfinable() {
        let store = PathGrantStore(capacity: 4)
        store.grant("/Users/test/Desktop/rules.txt")
        XCTAssertTrue(PathConfiner.isConfinable("/Users/test/Desktop/rules.txt", granted: store, containerRoots: roots))
    }

    func testContainerPath_IsConfinable() {
        let containerPath = "\(roots[0])/Library/Application Support/rules.txt"
        let store = PathGrantStore()
        let isConfinable = PathConfiner.isConfinable(
            containerPath,
            granted: store,
            containerRoots: roots
        )
        XCTAssertTrue(isConfinable)
    }

    func testEmptyPath_IsRejected() {
        XCTAssertFalse(PathConfiner.isConfinable("", granted: PathGrantStore(), containerRoots: roots))
    }

    func testRelativePath_IsRejected() {
        XCTAssertFalse(
            PathConfiner.isConfinable(
                "Documents/rules.txt",
                granted: PathGrantStore(),
                containerRoots: roots
            )
        )
    }

    func testUngrantedOutsidePath_IsRejected() {
        XCTAssertFalse(PathConfiner.isConfinable("/etc/passwd", granted: PathGrantStore(), containerRoots: roots))
    }

    // MARK: - confinementPath(for:)

    func testConfinementPath_RemoteUrl_IsNil() {
        // Remote http(s) URLs are fetched over the network; no confinement needed.
        XCTAssertNil(PathConfiner.confinementPath(for: "https://example.com/filter.txt"))
        XCTAssertNil(PathConfiner.confinementPath(for: "http://example.com/filter.txt"))
    }

    func testConfinementPath_RawPath_IsTheInput() {
        XCTAssertEqual(
            PathConfiner.confinementPath(for: "/Users/test/Desktop/rules.txt"),
            "/Users/test/Desktop/rules.txt"
        )
    }

    func testConfinementPath_FileUrl_ExtractsPath() {
        XCTAssertEqual(
            PathConfiner.confinementPath(for: "file:///Users/test/Desktop/rules.txt"),
            "/Users/test/Desktop/rules.txt"
        )
    }

    func testConfinementPath_FileUrl_WithoutPath_FallsBackToInput() {
        // A `file:` URL carrying no path is confined as-is (and rejected by
        // `isConfinable`, since it does not start with "/"). It cannot
        // Bypass the check.
        //
        // Note these inputs do parse: `URL(string: "file:")` yields a URL
        // Whose path is "". The name said "unparseable" while the code
        // Relied on `URL(string:)` returning nil, which it never does here.
        XCTAssertEqual(
            PathConfiner.confinementPath(for: "file:"),
            "file:"
        )
        XCTAssertEqual(
            PathConfiner.confinementPath(for: "file://"),
            "file://"
        )
    }

    func testConfinementPath_OtherScheme_IsNil() {
        XCTAssertNil(PathConfiner.confinementPath(for: "ftp://example.com/filter.txt"))
    }

    func testContainerRoots_WithNoAppGroup_YieldsHomeOnly() {
        XCTAssertEqual(PathConfiner.containerRoots(appGroupIdentifier: nil), [NSHomeDirectory()])
    }
}
