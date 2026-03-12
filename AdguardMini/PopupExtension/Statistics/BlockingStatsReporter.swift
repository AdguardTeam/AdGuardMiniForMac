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
    func incrementCount(for blockerType: SafariBlockerType, by count: Int) async
    func start() async
    func stop() async
}

// MARK: - BlockingStatsReporterImpl

actor BlockingStatsReporterImpl: BlockingStatsReporter {
    // MARK: Private properties

    private let safariApi: SafariApiInteractor
    private let flushInterval: TimeInterval

    private var counters: [SafariBlockerType: Int] = [:]
    private var flushTask: Task<Void, Never>?

    // MARK: Init

    init(safariApi: SafariApiInteractor, flushInterval: TimeInterval = 10.0) {
        self.safariApi = safariApi
        self.flushInterval = flushInterval
    }

    // MARK: Deinit

    deinit {
        flushTask?.cancel()
    }

    // MARK: Public methods

    func start() async {
        guard self.flushTask == nil else { return }

        LogInfo("BlockingStatsReporter started with \(self.flushInterval)s interval")

        self.flushTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { break }

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
        LogInfo("BlockingStatsReporter stopped")
    }

    func incrementCount(for blockerType: SafariBlockerType, by count: Int) async {
        self.counters[blockerType, default: 0] += count
    }

    // MARK: Private methods

    private func flush() async {
        guard !self.counters.isEmpty else { return }

        let batch = self.counters

        LogDebug("Flushing statistics batch: \(batch)")

        do {
            try await self.safariApi.reportBlockCounts(batch)

            for (blockerType, count) in batch {
                self.counters[blockerType, default: 0] -= count
                if self.counters[blockerType] == 0 {
                    self.counters.removeValue(forKey: blockerType)
                }
            }
            LogDebug("Statistics batch delivered successfully, counters reset")
        } catch {
            LogError("Failed to deliver statistics batch: \(error). Counters will accumulate.")
        }
    }
}
