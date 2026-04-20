// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  BlockingStatsReporter.swift
//  PopupExtension
//

import Foundation
import AML

// MARK: - BlockingStatsReporter

protocol BlockingStatsReporter {
    func recordBlocking(pageHash: Int, urls: [URL], blockerType: SafariBlockerType) async
    func enqueueBlocking(pageHash: Int, urls: [URL], blockerType: SafariBlockerType)
    func start() async
    func stop() async

    func enqueueStart()
    func enqueueStop()
}

// MARK: - BlockingStatsReporterImpl

actor BlockingStatsReporterImpl: BlockingStatsReporter {
    // MARK: Private properties

    private let statisticsStore: StatisticsStore
    private let flushInterval: TimeInterval

    private var counters: [SafariBlockerType: Int] = [:]
    private var pendingAdsBlockedTotal: Int = 0
    private var deduplicationState = DeduplicationState()
    private var flushTask: Task<Void, Never>?

    // MARK: Init

    init(statisticsStore: StatisticsStore, flushInterval: TimeInterval = 10.0) {
        self.statisticsStore = statisticsStore
        self.flushInterval = flushInterval
    }

    // MARK: Deinit

    deinit {
        self.flushTask?.cancel()
    }

    // MARK: Public methods

    func start() async {
        guard self.flushTask == nil else { return }

        LogDebug("BlockingStatsReporter started with \(self.flushInterval)s interval")

        self.flushTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(seconds: self.flushInterval)

                guard !Task.isCancelled else { break }
                await self.flush()
            }
        }
    }

    func stop() async {
        self.flushTask?.cancel()
        self.flushTask = nil
        await self.flush()
        self.deduplicationState = DeduplicationState()
        LogDebug("BlockingStatsReporter stopped")
    }

    func recordBlocking(pageHash: Int, urls: [URL], blockerType: SafariBlockerType) async {
        self.counters[blockerType, default: 0] += urls.count
        for url in urls {
            let delta = self.deduplicationState.recordCallback(
                pageHash: pageHash,
                url: url,
                blockerType: blockerType
            )
            self.pendingAdsBlockedTotal += delta
        }
    }

    nonisolated func enqueueStart() {
        Task { await self.start() }
    }

    nonisolated func enqueueStop() {
        Task { await self.stop() }
    }

    nonisolated func enqueueBlocking(pageHash: Int, urls: [URL], blockerType: SafariBlockerType) {
        Task { await self.recordBlocking(pageHash: pageHash, urls: urls, blockerType: blockerType) }
    }

    // MARK: Private methods

    private func flush() async {
        assert(self.pendingAdsBlockedTotal >= 0, "Pending ads-blocked total must not be negative")

        guard !self.counters.isEmpty else {
            assert(
                self.pendingAdsBlockedTotal == 0,
                "Pending ads-blocked total must be zero when there are no pending counters"
            )
            return
        }

        let batch = self.counters
        let batchAdsBlockedTotal = self.pendingAdsBlockedTotal

        let totalCount = batch.values.reduce(0, +)
        LogDebug(
            "Flushing statistics: \(batch.count) type(s), \(totalCount) total blocks, \(batchAdsBlockedTotal) ads-blocked"
        )

        do {
            try self.statisticsStore.addCounts(batch)
            if batchAdsBlockedTotal > 0 {
                try self.statisticsStore.addAdsBlockedTotal(batchAdsBlockedTotal)
            }

            for (blockerType, count) in batch {
                self.counters[blockerType, default: 0] -= count
                if self.counters[blockerType] == 0 {
                    self.counters.removeValue(forKey: blockerType)
                }
            }
            self.pendingAdsBlockedTotal -= batchAdsBlockedTotal
            assert(
                self.pendingAdsBlockedTotal >= 0,
                "Pending ads-blocked total must not become negative after flush"
            )
            LogDebug("Statistics batch written to shared store successfully, counters reset")
        } catch {
            LogError("Failed to write statistics batch to shared store: \(error). Counters will accumulate.")
        }
    }
}
