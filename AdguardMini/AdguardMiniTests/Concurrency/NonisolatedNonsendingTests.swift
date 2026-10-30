// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  NonisolatedNonsendingTests.swift
//  AdguardMiniTests
//

import XCTest
import Foundation

// MARK: - Tests

// `testPlainNonisolatedAsyncRunsOnCallerActor` is the guard for the build setting that installs those semantics.
/// Verifies the project's concurrency semantics: a plain `nonisolated async`
/// function runs on its caller's actor, a `@concurrent` one does not.
@MainActor
final class NonisolatedNonsendingTests: XCTestCase {
    func testPlainNonisolatedAsyncRunsOnCallerActor() async {
        let isMainThread = await callerActorProbe()

        XCTAssertTrue(
            isMainThread,
            "A nonisolated async function must run on its caller's actor; "
                + "check SWIFT_UPCOMING_FEATURE_NONISOLATED_NONSENDING_BY_DEFAULT"
        )
    }

    func testConcurrentRunsOffCallerActor() async {
        let isMainThread = await concurrentProbe()

        XCTAssertFalse(
            isMainThread,
            "A `@concurrent` function must run off the caller's actor"
        )
    }
}

// MARK: - Probes

/// Reads the current thread synchronously, because `Thread.isMainThread` is
/// marked unavailable from async contexts.
private func isRunningOnMainThread() -> Bool {
    Thread.isMainThread
}

/// Plain `nonisolated async` probe: its body runs on the caller's actor.
private func callerActorProbe() async -> Bool {
    isRunningOnMainThread()
}

/// `@concurrent` probe: its body runs on the global executor, unlike the plain probe.
@concurrent
private func concurrentProbe() async -> Bool {
    isRunningOnMainThread()
}
