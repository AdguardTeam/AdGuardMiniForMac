// SPDX-FileCopyrightText: AdGuard Software Limited
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  DeduplicationStateTests.swift
//  AdguardMiniTests
//

import XCTest

final class DeduplicationStateTests: XCTestCase {
    private var state = DeduplicationState()

    override func setUp() {
        super.setUp()
        state = DeduplicationState()
    }

    // MARK: - Single blocker

    func testSingleBlocker_SingleURL_DeltaIsOne() {
        let url = URL(string: "https://tracker.example.com/pixel.js")!
        let delta = state.recordCallback(pageHash: 1, url: url, blockerType: .general)
        XCTAssertEqual(delta, 1)
    }

    // MARK: - Multiple blockers, same URL

    func testSixBlockers_SameURL_TotalDeltaIsOne() {
        let url = URL(string: "https://tracker.example.com/pixel.js")!
        let blockerTypes: [SafariBlockerType] = [
            .general,
            .privacy,
            .security,
            .socialWidgetsAndAnnoyances,
            .other,
            .custom
        ]

        var totalDelta = 0
        for bt in blockerTypes {
            totalDelta += state.recordCallback(pageHash: 1, url: url, blockerType: bt)
        }

        XCTAssertEqual(totalDelta, 1, "6 blockers for the same URL should produce total delta of 1")
    }

    func testTwoBlockers_SameURL_TotalDeltaIsOne() {
        let url = URL(string: "https://ad.example.com/banner.js")!

        let delta1 = state.recordCallback(pageHash: 1, url: url, blockerType: .general)
        let delta2 = state.recordCallback(pageHash: 1, url: url, blockerType: .privacy)

        XCTAssertEqual(delta1 + delta2, 1)
    }

    // MARK: - Repeated requests (same URL blocked multiple times)

    func testRepeatedRequests_NTimesKBlockers_DeltaIsN() {
        let url = URL(string: "https://analytics.example.com/beacon")!
        let blockerTypes: [SafariBlockerType] = [.general, .privacy, .security, .socialWidgetsAndAnnoyances, .other]
        let requestCount = 10

        var totalDelta = 0
        for _ in 0..<requestCount {
            for bt in blockerTypes {
                totalDelta += state.recordCallback(pageHash: 1, url: url, blockerType: bt)
            }
        }

        XCTAssertEqual(totalDelta, requestCount, "10 requests × 5 blockers should produce delta of 10")
    }

    func testRepeatedRequests_PrivacyBlocker_DeltaIsZero() {
        let url = URL(string: "https://tracker.example.com/pixel.js")!

        var totalDelta = 0
        for _ in 0..<5 {
            totalDelta += state.recordCallback(pageHash: 1, url: url, blockerType: .privacy)
        }

        XCTAssertEqual(totalDelta, 0, "Privacy callbacks should not contribute to ads-blocked delta")
    }

    // MARK: - Parallel tabs (different pageHash)

    func testParallelTabs_SameURL_IndependentCounts() {
        let url = URL(string: "https://common-tracker.example.com/t.js")!
        let blockerTypes: [SafariBlockerType] = [
            .general,
            .privacy,
            .security,
            .socialWidgetsAndAnnoyances,
            .other,
            .custom
        ]

        var totalDelta = 0
        // Tab A
        for bt in blockerTypes {
            totalDelta += state.recordCallback(pageHash: 100, url: url, blockerType: bt)
        }
        // Tab B
        for bt in blockerTypes {
            totalDelta += state.recordCallback(pageHash: 200, url: url, blockerType: bt)
        }

        XCTAssertEqual(totalDelta, 2, "Same URL in 2 tabs should produce delta of 2")
    }

    func testInterleavedTabs_SameURL_CorrectCount() {
        let url = URL(string: "https://tracker.example.com/t.js")!
        let blockers: [SafariBlockerType] = [.general, .privacy, .security]

        var totalDelta = 0
        // Interleaved: Tab A CB1, Tab B CB1, Tab A CB2, Tab B CB2, ...
        for bt in blockers {
            totalDelta += state.recordCallback(pageHash: 10, url: url, blockerType: bt)
            totalDelta += state.recordCallback(pageHash: 20, url: url, blockerType: bt)
        }

        XCTAssertEqual(totalDelta, 2, "Interleaved callbacks for 2 tabs should produce delta of 2")
    }

    // MARK: - Flush boundary (state preserved)

    func testFlushBoundary_StatePreserved_NoPhantomIncrements() {
        let url = URL(string: "https://ad.example.com/script.js")!
        let blockerTypes: [SafariBlockerType] = [
            .general,
            .privacy,
            .security,
            .socialWidgetsAndAnnoyances,
            .other,
            .custom
        ]

        var totalDelta = 0

        // First 3 callbacks arrive before flush
        for bt in blockerTypes[0..<3] {
            totalDelta += state.recordCallback(pageHash: 1, url: url, blockerType: bt)
        }

        // --- Simulated flush: pendingTotal is snapshotted and reset, but state is NOT cleared ---

        // Remaining 3 callbacks arrive after flush
        for bt in blockerTypes[3..<6] {
            totalDelta += state.recordCallback(pageHash: 1, url: url, blockerType: bt)
        }

        XCTAssertEqual(totalDelta, 1, "Flush boundary should not produce phantom increments")
    }

    // MARK: - Different URLs on same page

    func testDifferentURLs_SamePage_IndependentDeltas() {
        let url1 = URL(string: "https://ad1.example.com/a.js")!
        let url2 = URL(string: "https://ad2.example.com/b.js")!
        let url3 = URL(string: "https://ad3.example.com/c.js")!

        var totalDelta = 0
        // Each URL blocked by 3 blockers
        for url in [url1, url2, url3] {
            for bt: SafariBlockerType in [.general, .privacy, .security] {
                totalDelta += state.recordCallback(pageHash: 1, url: url, blockerType: bt)
            }
        }

        XCTAssertEqual(totalDelta, 3, "3 different URLs should produce delta of 3")
    }

    // MARK: - Mixed scenario from spec

    func testMixedScenario_OneURLBy6CB_Plus10PrivacyRequests() {
        let urlA = URL(string: "https://ad.example.com/a.js")!
        let urlB = URL(string: "https://tracker.example.com/b.js")!

        var totalDelta = 0

        // URL-A blocked by 6 content blockers
        for bt: SafariBlockerType in [.general, .privacy, .security, .socialWidgetsAndAnnoyances, .other, .custom] {
            totalDelta += state.recordCallback(pageHash: 1, url: urlA, blockerType: bt)
        }

        // URL-B blocked by 1 content blocker, 10 times (10 requests)
        for _ in 0..<10 {
            totalDelta += state.recordCallback(pageHash: 1, url: urlB, blockerType: .privacy)
        }

        XCTAssertEqual(totalDelta, 1, "Privacy-only callbacks must not increase the ads-blocked total")
    }

    // MARK: - Delta invariant

    func testDeltaIsAlwaysZeroOrOne() {
        let url = URL(string: "https://example.com/test.js")!
        let blockerTypes: [SafariBlockerType] = [
            .general,
            .privacy,
            .security,
            .socialWidgetsAndAnnoyances,
            .other,
            .custom
        ]

        for _ in 0..<20 {
            for bt in blockerTypes {
                let delta = state.recordCallback(pageHash: 1, url: url, blockerType: bt)
                XCTAssertTrue(delta == 0 || delta == 1, "Delta must be 0 or 1, got \(delta)")
            }
        }
    }
}
