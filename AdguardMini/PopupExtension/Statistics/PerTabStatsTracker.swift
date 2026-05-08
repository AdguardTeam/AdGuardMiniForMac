// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PerTabStatsTracker.swift
//  PopupExtension
//

import SafariServices
import AML

// MARK: - TabStats

struct TabStats {
    var adsBlocked: Int = 0
    var trackersBlocked: Int = 0
    var url: String = ""
    var lastTimeUpdated: Double = Date().timeIntervalSince1970

    var total: Int { self.adsBlocked + self.trackersBlocked }

    var badgeText: String {
        switch self.total {
        case 0: ""
        case 1..<100: String(self.total)
        default: "∞"
        }
    }
}

// MARK: - PerTabStatsTracker

actor PerTabStatsTracker {
    private enum Constants {
        /// Stale entries older than this are evicted during cleanup.
        static let evictionDelay: TimeInterval = 24.hours
    }

    private var tabData: [Int: TabStats] = [:]
    private var deduplicationStates: [Int: DeduplicationState] = [:]

    // MARK: Tracking

    /// Records a blocking event for a specific page/tab.
    ///
    /// - Parameters:
    ///   - pageHash: Stable page identity (`page.hashValue`), captured
    ///     synchronously in the handler before spawning a Task.
    ///   - urls: The blocked resource URLs.
    ///   - blockerType: The type of content blocker that fired.
    ///   - page: The Safari page (used only to query the current URL).
    func trackBlocked(pageHash: Int, urls: [URL], blockerType: SafariBlockerType, page: SFSafariPage) async {
        let pageUrl = await page.properties()?.url?.absoluteString ?? ""

        var stats = self.tabData[pageHash] ?? TabStats()

        // Reset if the URL changed (navigation)
        if stats.url != pageUrl {
            stats = TabStats(url: pageUrl)
            self.deduplicationStates[pageHash] = DeduplicationState()
        }

        if blockerType == .privacy {
            stats.trackersBlocked += urls.count
        } else {
            for url in urls {
                let delta = self.deduplicationStates[pageHash, default: DeduplicationState()]
                    .recordCallback(
                        pageHash: pageHash,
                        url: url,
                        blockerType: blockerType
                    )
                stats.adsBlocked += delta
            }
        }

        stats.lastTimeUpdated = Date().timeIntervalSince1970
        self.tabData[pageHash] = stats
    }

    // MARK: Querying

    /// Returns per-tab stats for the active tab in the given window.
    ///
    /// The returned stats are validated against the live page URL. If the tab
    /// has already navigated to a new URL but nothing was blocked on that page
    /// yet (so `resetStats` or `trackBlocked` haven't updated the store), the
    /// stored stats belong to the previous page and must not be displayed.
    /// In that case empty stats for the new URL are returned, eliminating any
    /// race between `willNavigateTo` / `resetStats` and `validateToolbarItem`.
    func getStatsForActiveTab(in window: SFSafariWindow) async -> TabStats {
        guard let page = await window.activeTab()?.activePage() else {
            return TabStats()
        }

        let pageHash = page.hashValue
        let stored = self.tabData[pageHash] ?? TabStats()

        let currentUrl = await page.properties()?.url?.absoluteString
        if let currentUrl, !currentUrl.isEmpty, stored.url != currentUrl {
            return TabStats(url: currentUrl)
        }

        return stored
    }

    // MARK: Lifecycle

    /// Resets stats for a page (called on navigation).
    ///
    /// This method has **no suspension points**, so it executes atomically on
    /// the actor. If a `trackBlocked` Task was suspended (awaiting
    /// `page.properties()`) when this runs, `trackBlocked` will read the
    /// freshly reset `tabData` upon resumption and accumulate on top of it.
    ///
    /// - Parameters:
    ///   - pageHash: Stable page identity (`page.hashValue`).
    ///   - newUrl: The destination URL reported by `willNavigateTo`.
    func resetStats(pageHash: Int, to newUrl: URL?) {
        let pageUrl = newUrl?.absoluteString ?? ""
        self.tabData[pageHash] = TabStats(url: pageUrl)
        self.deduplicationStates[pageHash] = DeduplicationState()
    }

    /// Removes entries older than `evictionDelay`.
    func evictStaleEntries() {
        let now = Date().timeIntervalSince1970
        for (key, stats) in self.tabData where now - stats.lastTimeUpdated > Constants.evictionDelay {
            self.tabData.removeValue(forKey: key)
            self.deduplicationStates.removeValue(forKey: key)
        }
    }
}
