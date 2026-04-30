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

    private var tabData: [String: TabStats] = [:]
    private var deduplicationStates: [String: DeduplicationState] = [:]

    // MARK: Tracking

    /// Records a blocking event for a specific page/tab.
    ///
    /// - Parameters:
    ///   - page: The Safari page where blocking occurred.
    ///   - urls: The blocked resource URLs.
    ///   - blockerType: The type of content blocker that fired.
    func trackBlocked(on page: SFSafariPage, urls: [URL], blockerType: SafariBlockerType) async {
        let tab = await page.containingTab()
        guard let tabKey = tab.tabKey() else {
            LogError("Cannot generate tab key")
            return
        }

        let pageUrl = await page.properties()?.url?.absoluteString ?? ""

        var stats = self.tabData[tabKey] ?? TabStats()

        // Reset if the URL changed (navigation)
        if stats.url != pageUrl {
            stats = TabStats(url: pageUrl)
            self.deduplicationStates[tabKey] = DeduplicationState()
        }

        if blockerType == .privacy {
            stats.trackersBlocked += urls.count
        } else {
            for url in urls {
                let delta = self.deduplicationStates[tabKey, default: DeduplicationState()]
                    .recordCallback(
                        pageHash: page.hashValue,
                        url: url,
                        blockerType: blockerType
                    )
                stats.adsBlocked += delta
            }
        }

        stats.lastTimeUpdated = Date().timeIntervalSince1970
        self.tabData[tabKey] = stats
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
        guard let tab = await window.activeTab(),
              let tabKey = tab.tabKey() else {
            return TabStats()
        }

        let stored = self.tabData[tabKey] ?? TabStats()

        let currentUrl = await tab.activePage()?.properties()?.url?.absoluteString
        if let currentUrl, !currentUrl.isEmpty, stored.url != currentUrl {
            return TabStats(url: currentUrl)
        }

        return stored
    }

    // MARK: Lifecycle

    /// Resets stats for a specific page (called on navigation reset).
    ///
    /// - Parameters:
    ///   - page: The Safari page that is navigating away.
    ///   - newUrl: The destination URL reported by `willNavigateTo`. Using this
    ///     parameter avoids a race condition where `page.properties()` still
    ///     returns the old URL, and eliminates the unreliable `activePage`
    ///     identity check that could cause the reset to be skipped entirely.
    func resetStats(on page: SFSafariPage, to newUrl: URL?) async {
        let tab = await page.containingTab()
        guard let tabKey = tab.tabKey() else { return }

        let pageUrl = newUrl?.absoluteString ?? ""
        self.tabData[tabKey] = TabStats(url: pageUrl)
        self.deduplicationStates[tabKey] = DeduplicationState()
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
