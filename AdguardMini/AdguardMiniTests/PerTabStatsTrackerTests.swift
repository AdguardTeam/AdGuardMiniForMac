// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PerTabStatsTrackerTests.swift
//  AdguardMiniTests
//

import XCTest

final class PerTabStatsTrackerTests: XCTestCase {
    func testTabStatsTotal() {
        var stats = TabStats()
        XCTAssertEqual(stats.total, 0)

        stats.adsBlocked = 10
        stats.trackersBlocked = 5
        XCTAssertEqual(stats.total, 15)
    }

    func testTabStatsDefaultValues() {
        let stats = TabStats()
        XCTAssertEqual(stats.adsBlocked, 0)
        XCTAssertEqual(stats.trackersBlocked, 0)
        XCTAssertEqual(stats.url, "")
        XCTAssertTrue(stats.lastTimeUpdated > 0)
    }

    func testDeduplicationStatePrivacyExcluded() {
        var dedup = DeduplicationState()
        let delta = dedup.recordCallback(
            pageHash: 1,
            url: URL(string: "https://example.com/tracker.js")!,
            blockerType: .privacy
        )
        XCTAssertEqual(delta, 0, "Privacy callbacks should not contribute to ads-blocked delta")
    }

    func testDeduplicationStateAdsDeduplicated() {
        var dedup = DeduplicationState()
        let url = URL(string: "https://example.com/ad.js")!

        let delta1 = dedup.recordCallback(pageHash: 1, url: url, blockerType: .general)
        XCTAssertEqual(delta1, 1, "First callback should produce delta 1")

        let delta2 = dedup.recordCallback(pageHash: 1, url: url, blockerType: .general)
        XCTAssertEqual(delta2, 1, "Second callback from same blocker should produce delta 1")

        let delta3 = dedup.recordCallback(pageHash: 1, url: url, blockerType: .other)
        XCTAssertEqual(delta3, 0, "Callback from different blocker with lower count should produce delta 0")
    }

    func testBadgeTextFormat() {
        let stats1 = TabStats(adsBlocked: 0, trackersBlocked: 0)
        XCTAssertEqual(stats1.badgeText, "", "Zero total should produce empty badge")

        let stats2 = TabStats(adsBlocked: 10, trackersBlocked: 5)
        XCTAssertEqual(stats2.badgeText, "15", "Badge should show plain number for total < 100")

        let stats3 = TabStats(adsBlocked: 50, trackersBlocked: 50)
        XCTAssertEqual(stats3.badgeText, "∞", "Badge should show ∞ for total >= 100")

        let stats4 = TabStats(adsBlocked: 99, trackersBlocked: 0)
        XCTAssertEqual(stats4.badgeText, "99", "Badge should show plain number for total = 99")
    }
}
