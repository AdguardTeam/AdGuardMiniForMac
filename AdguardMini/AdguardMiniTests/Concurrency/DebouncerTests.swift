// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  DebouncerTests.swift
//  AdguardMiniTests
//

import XCTest
import Foundation
import AML

// MARK: - Thread check

/// Reads the current thread synchronously, because `Thread.isMainThread` is
/// marked unavailable from async contexts.
private func isRunningOnMainThread() -> Bool {
    Thread.isMainThread
}

// MARK: - FlagBox

/// Thread-safe boolean shared between the test and the debounced job.
/// `@unchecked Sendable` because the stored value is guarded by the lock.
private final class FlagBox: @unchecked Sendable {
    private let lock = UnfairLock()
    private var storedValue: Bool

    /// The last value written, or `initialValue` when nothing was written yet.
    init(initialValue: Bool = false) {
        self.storedValue = initialValue
    }

    var value: Bool {
        locked(self.lock) { self.storedValue }
    }

    func set(_ value: Bool = true) {
        locked(self.lock) { self.storedValue = value }
    }
}

// MARK: - Tests

/// A job scheduled through `Debouncer.debounce` from the main actor runs off the
/// main actor, and a newer call cancels the pending job instead of running it.
@MainActor
final class DebouncerTests: XCTestCase {
    /// Long enough for the debouncer's timer, short enough to fail a regression
    /// instead of waiting for the XCTest timeout.
    private static let waitDeadlineSeconds: TimeInterval = 5

    func testDebouncedJobRunsOffMainActor() async {
        let debouncer = Debouncer(debounceTimeSeconds: 0.05)
        // Assumed main until the job records the thread it actually runs on.
        let ranOnMainThread = FlagBox(initialValue: true)
        let jobRan = XCTestExpectation(description: "The debounced job runs")

        let job: @Sendable () async -> Void = {
            ranOnMainThread.set(isRunningOnMainThread())
            jobRan.fulfill()
        }
        Task {
            await debouncer.debounce(job)
        }

        await fulfillment(of: [jobRan], timeout: Self.waitDeadlineSeconds)

        XCTAssertFalse(ranOnMainThread.value, "The debounced job must run off the main actor")
    }

    func testNewerCallCancelsPendingJob() async {
        // A one-second timer cannot fire before the second call even on a stalled main actor.
        let debounceTimeSeconds: TimeInterval = 1
        let debouncer = Debouncer(debounceTimeSeconds: debounceTimeSeconds)
        let firstJobRan = XCTestExpectation(description: "The superseded job must not run")
        firstJobRan.isInverted = true
        let cancelled = XCTestExpectation(description: "The superseded job's onCancel runs")

        let firstJob: @Sendable () async -> Void = {
            firstJobRan.fulfill()
        }
        let secondJob: @Sendable () async -> Void = {}
        let onCancel: @Sendable () -> Void = {
            cancelled.fulfill()
        }

        await debouncer.debounce(firstJob, onCancel: onCancel)
        await debouncer.debounce(secondJob)
        await fulfillment(of: [cancelled], timeout: Self.waitDeadlineSeconds)

        // Wait out the debounce window: a job that ignored cancellation runs in it.
        await fulfillment(of: [firstJobRan], timeout: debounceTimeSeconds + 0.5)
    }
}
