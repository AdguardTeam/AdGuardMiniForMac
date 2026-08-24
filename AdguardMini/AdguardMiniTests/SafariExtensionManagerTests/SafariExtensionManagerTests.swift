// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensionManagerTests.swift
//  AdguardMiniTests
//

import AML
import XCTest

/// Holds the first reload call suspended (as if still inside Safari) so a newer
/// operation can supersede it; every later call completes immediately.
private actor GatedReload {
    private var callCount = 0
    private var waiters: [CheckedContinuation<Void, Never>] = []

    func reload() async {
        self.callCount += 1
        guard self.callCount == 1 else { return }
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            self.waiters.append(continuation)
        }
    }

    func waitForSuspendedCall() async {
        while self.waiters.isEmpty {
            await Task.yield()
        }
    }

    func open() async {
        let toResume = self.waiters
        self.waiters = []
        toResume.forEach { $0.resume() }
    }
}

final class SafariExtensionManagerTests: XCTestCase {
    // MARK: Fixtures

    private func makeManager(
        reload: @escaping @Sendable (SafariBlockerType) async throws -> Void,
        clock: RecordingClock,
        logRecorder: LogRecorder = LogRecorder()
    ) -> (manager: SafariExtensionManagerImpl, delegate: ReloadDelegateSpy) {
        let delegate = ReloadDelegateSpy()
        let manager = SafariExtensionManagerImpl(
            delegate: delegate,
            safariPopupApiClient: SafariPopupApiStub(),
            sleep: { try await clock.sleep($0) },
            reloadBlocker: reload
        ) { logRecorder.log($0) }
        return (manager, delegate)
    }

    private func makeManagerWithManualClock(
        reload: @escaping @Sendable (SafariBlockerType) async throws -> Void,
        clock: ManualSleepClock
    ) -> (manager: SafariExtensionManagerImpl, delegate: ReloadDelegateSpy) {
        let delegate = ReloadDelegateSpy()
        let manager = SafariExtensionManagerImpl(
            delegate: delegate,
            safariPopupApiClient: SafariPopupApiStub(),
            sleep: { try await clock.sleep($0) },
            reloadBlocker: reload
        ) { _ in }
        return (manager, delegate)
    }

    /// First-attempt success: no sleep is recorded and the delegate sees exactly
    /// one start and one successful end (no extra log-worthy activity).
    func testFirstAttemptSuccessRecordsNoSleepAndSingleResult() async {
        let clock = RecordingClock()
        let (manager, delegate) = self.makeManager(reload: { _ in }, clock: clock)

        let result = await manager.reloadContentBlocker(.general)

        XCTAssertTrue(result)
        let delays = await clock.recordedDelays
        XCTAssertEqual(delays, [])
        XCTAssertEqual(delegate.startCount, 1)
        XCTAssertEqual(delegate.endResults.count, 1)
        XCTAssertNil(delegate.endResults.first?.error)
    }

    /// One transient failure recovers on the first retry after a 1 s delay.
    func testTransientFailureRecoversOnRetry() async {
        let clock = RecordingClock()
        let fake = FakeSafariReload(failuresBeforeSuccess: 1)
        let (manager, delegate) = self.makeManager(
            reload: { _ in try await fake.reload() },
            clock: clock
        )

        let result = await manager.reloadContentBlocker(.general)

        XCTAssertTrue(result)
        let delays = await clock.recordedDelays
        XCTAssertEqual(delays, [1])
        let attempts = await fake.attemptCount
        XCTAssertEqual(attempts, 2)
        XCTAssertEqual(delegate.endResults.count, 1)
        XCTAssertNil(delegate.endResults.first?.error)
    }

    /// Exhaustion: exactly 3 attempts with delays 1 s then 2 s, the failure is
    /// reported through `onEndReload`, and the method returns false.
    func testExhaustionStopsAfterThreeAttemptsAndReportsFailure() async {
        let clock = RecordingClock()
        let fake = FakeSafariReload(failuresBeforeSuccess: nil)
        let (manager, delegate) = self.makeManager(
            reload: { _ in try await fake.reload() },
            clock: clock
        )

        let result = await manager.reloadContentBlocker(.general)

        XCTAssertFalse(result)
        let delays = await clock.recordedDelays
        XCTAssertEqual(delays, [1, 2])
        let attempts = await fake.attemptCount
        XCTAssertEqual(attempts, 3)
        XCTAssertEqual(delegate.endResults.count, 1)
        XCTAssertNotNil(delegate.endResults.first?.error)
    }

    /// The `.advanced` no-op short-circuit never calls the reload API and never
    /// sleeps.
    func testAdvancedBlockerShortCircuitsWithoutRetry() async {
        let clock = RecordingClock()
        let fake = FakeSafariReload(failuresBeforeSuccess: nil)
        let (manager, delegate) = self.makeManager(
            reload: { _ in try await fake.reload() },
            clock: clock
        )

        let result = await manager.reloadContentBlocker(.advanced)

        XCTAssertTrue(result)
        let delays = await clock.recordedDelays
        XCTAssertEqual(delays, [])
        let attempts = await fake.attemptCount
        XCTAssertEqual(attempts, 0)
        XCTAssertEqual(delegate.startCount, 1)
        XCTAssertEqual(delegate.endResults.count, 1)
        XCTAssertNil(delegate.endResults.first?.error)
    }

    /// `reloadAllContentBlockers` aggregates per-type results: six real blocker
    /// types each exhaust after 3 attempts (6 x 3 = 18 calls), `.advanced` is a
    /// no-op, the 1 s/2 s schedule is recorded 6 times, and the overall result
    /// is false because `numberOfFailed > 0`. Blockers run in parallel, so the
    /// recorded delays are asserted only as a multiset.
    func testReloadAllReportsExhaustedBlockersAsFailed() async {
        let clock = RecordingClock()
        let logRecorder = LogRecorder()
        let fake = FakeSafariReload(failuresBeforeSuccess: nil)
        let (manager, _) = self.makeManager(
            reload: { _ in try await fake.reload() },
            clock: clock,
            logRecorder: logRecorder
        )

        let result = await manager.reloadAllContentBlockers()

        XCTAssertFalse(result)
        let attempts = await fake.attemptCount
        XCTAssertEqual(attempts, 18)
        let messages = logRecorder.messages
        XCTAssertEqual(messages.count, 6)
        let delays = await clock.recordedDelays
        XCTAssertEqual(delays.sorted(), [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2])
    }

    /// Exhaustion emits exactly one `[Safari]`-tagged `LogError` naming the failed
    /// blocker, and no other log activity.
    func testExhaustionEmitsExactlyOneSafariLogError() async {
        let clock = RecordingClock()
        let logRecorder = LogRecorder()
        let fake = FakeSafariReload(failuresBeforeSuccess: nil)
        let (manager, _) = self.makeManager(
            reload: { _ in try await fake.reload() },
            clock: clock,
            logRecorder: logRecorder
        )

        let result = await manager.reloadContentBlocker(.general)

        XCTAssertFalse(result)
        let messages = logRecorder.messages
        XCTAssertEqual(messages.count, 1)
        XCTAssertTrue(messages[0].contains(LogTag.safari))
        XCTAssertTrue(messages[0].contains("reloadContentBlocker(general)"))
    }

    /// A reload that recovers on a retry never emits the exhaustion log.
    func testRecoveredReloadEmitsNoExhaustionLog() async {
        let clock = RecordingClock()
        let logRecorder = LogRecorder()
        let fake = FakeSafariReload(failuresBeforeSuccess: 1)
        let (manager, _) = self.makeManager(
            reload: { _ in try await fake.reload() },
            clock: clock,
            logRecorder: logRecorder
        )

        let result = await manager.reloadContentBlocker(.general)

        XCTAssertTrue(result)
        XCTAssertEqual(logRecorder.messages.count, 0)
    }

    /// A first-attempt success emits no exhaustion log.
    func testFirstAttemptSuccessEmitsNoExhaustionLog() async {
        let clock = RecordingClock()
        let logRecorder = LogRecorder()
        let (manager, _) = self.makeManager(
            reload: { _ in },
            clock: clock,
            logRecorder: logRecorder
        )

        let result = await manager.reloadContentBlocker(.general)

        XCTAssertTrue(result)
        XCTAssertEqual(logRecorder.messages.count, 0)
    }

    /// A newer reload operation on the same blocker supersedes a pending retry:
    /// the stale loop aborts after its backoff delay, issues no further Safari
    /// call, and only the newest operation reports its outcome.
    func testNewOperationSupersedesPendingRetryWithoutFurtherReload() async {
        let clock = ManualSleepClock()
        let fake = FakeSafariReload(failuresBeforeSuccess: 1)
        let (manager, delegate) = self.makeManagerWithManualClock(
            reload: { _ in try await fake.reload() },
            clock: clock
        )

        // First operation: attempt 1 fails, its 1 s backoff is left pending.
        let firstOperation = Task { await manager.reloadContentBlocker(.general) }
        await clock.waitForNextSleep()

        // The second, newer operation supersedes the first one's pending retry.
        // Its attempt is the fake's second call, so it succeeds immediately.
        let secondResult = await manager.reloadContentBlocker(.general)

        XCTAssertTrue(secondResult)
        clock.releaseSleep()
        let firstResult = await firstOperation.value

        XCTAssertFalse(firstResult)
        let attempts = await fake.attemptCount
        XCTAssertEqual(attempts, 2) // One call per operation; no retry from the stale loop.
        XCTAssertEqual(delegate.startCount, 2)
        XCTAssertEqual(delegate.endResults.count, 1) // Only the newest operation reported an end.
        XCTAssertNil(delegate.endResults.first?.error)
    }

    /// Protection being toggled off `reloadAllContentBlockers` supersedes a pending
    /// retry for any blocker, so a stale loop fires no reload after that.
    func testReloadAllAbortsStaleRetryAndReloadsEverythingOnce() async {
        let clock = ManualSleepClock()
        let fake = FakeSafariReload(failuresBeforeSuccess: 1)
        let (manager, delegate) = self.makeManagerWithManualClock(
            reload: { _ in try await fake.reload() },
            clock: clock
        )

        // Stale operation: a privacy attempt fails and its backoff is pending.
        let staleOperation = Task { await manager.reloadContentBlocker(.privacy) }
        await clock.waitForNextSleep()

        // New operation (protection restart/turn-off) reloads every blocker.
        let allReloadResult = await manager.reloadAllContentBlockers()

        XCTAssertTrue(allReloadResult)
        clock.releaseSleep()
        let staleResult = await staleOperation.value

        XCTAssertFalse(staleResult)
        let attempts = await fake.attemptCount
        XCTAssertEqual(attempts, 7) // Stale attempt 1 + six real blockers in reloadAll.
        XCTAssertEqual(delegate.endResults.count, 7) // Six real + `.advanced` no-op.
        XCTAssertTrue(delegate.endResults.allSatisfy { $0.error == nil })
    }

    /// A partial reload (`reloadContentBlockers` with a subset) must not
    /// supersede a pending retry on an unchanged blocker: that blocker is left
    /// untouched, so its retry keeps running and releases its own in-progress
    /// flag instead of being stranded on `.loading`.
    func testPartialReloadLeavesPendingRetryOnUnchangedBlockerAlive() async {
        let clock = ManualSleepClock()
        let fake = FakeSafariReload(failuresBeforeSuccess: 1)
        let (manager, delegate) = self.makeManagerWithManualClock(
            reload: { _ in try await fake.reload() },
            clock: clock
        )

        // A privacy retry is left pending after its first failed attempt.
        let pendingOperation = Task { await manager.reloadContentBlocker(.privacy) }
        await clock.waitForNextSleep()

        // The partial reload touches only `.general`, not `.privacy`.
        let partialResult = await manager.reloadContentBlockers([.general])
        XCTAssertTrue(partialResult)

        // The pending privacy retry survives and completes on its own.
        clock.releaseSleep()
        let pendingResult = await pendingOperation.value

        XCTAssertTrue(pendingResult)
        let attempts = await fake.attemptCount
        XCTAssertEqual(attempts, 3) // Privacy attempt 1 + general + privacy retry.
        XCTAssertEqual(delegate.endResults.count, 2) // Both blockers reported an end.
        XCTAssertTrue(delegate.endResults.allSatisfy { $0.error == nil })
    }

    /// A stale loop whose Safari call completes after a newer operation already
    /// started stays silent: its otherwise-successful result must not clear the
    /// newer operation's freshly persisted `.safariError` or toggle its
    /// in-progress flag.
    func testSupersededLoopStaysSilentAfterStaleSuccess() async {
        let gated = GatedReload()
        let clock = RecordingClock()
        let (manager, delegate) = self.makeManager(
            reload: { _ in await gated.reload() },
            clock: clock
        )

        // The stale operation is held "inside Safari".
        let staleOperation = Task { await manager.reloadContentBlocker(.general) }
        await gated.waitForSuspendedCall()

        // The newer operation supersedes it and reports its own outcome.
        let newResult = await manager.reloadContentBlocker(.general)
        XCTAssertTrue(newResult)

        // The stale Safari call then returns, but its loop is superseded.
        // No report is emitted from the stale loop.
        await gated.open()
        let staleResult = await staleOperation.value

        XCTAssertFalse(staleResult)
        XCTAssertEqual(delegate.startCount, 2)
        XCTAssertEqual(delegate.endResults.count, 1) // Only the newer operation reported an end.
        XCTAssertNil(delegate.endResults.first?.error)
    }

    /// Cancelling the reload task mid-backoff aborts the retry loop without issuing
    /// a further Safari call (fixes the `try? await self.sleep(delay)` cancellation
    /// swallow), and emits exactly one abort
    /// `onEndReload(type, error: nil, isAborted: true)` for the same blocker so the
    /// in-progress flag is never stranded on `.loading` when no newer operation
    /// reloads that type.
    func testCancellationAbortsPendingRetryWithoutFurtherReload() async {
        let clock = ManualSleepClock()
        let fake = FakeSafariReload(failuresBeforeSuccess: 1)
        let (manager, delegate) = self.makeManagerWithManualClock(
            reload: { _ in try await fake.reload() },
            clock: clock
        )

        let operation = Task { await manager.reloadContentBlocker(.general) }
        await clock.waitForNextSleep()

        operation.cancel()
        // Clock resumes the pending sleep with `CancellationError`.
        // The loop abandons the retry: the fake's second call is not issued.
        // One abort report is left for the same blocker.
        let result = await operation.value

        XCTAssertFalse(result)
        let attempts = await fake.attemptCount
        XCTAssertEqual(attempts, 1)
        XCTAssertEqual(delegate.endResults.count, 1)
        XCTAssertEqual(delegate.endResults.first?.blockerType, .general)
        XCTAssertNil(delegate.endResults.first?.error)
        XCTAssertTrue(delegate.endResults.first?.isAborted ?? false)
    }

    /// A task that is both cancelled and superseded reports nothing: a newer
    /// operation on this blocker owns the in-progress flag, and only its own
    /// end report may re-establish the final state. The stale loop must not
    /// clobber the newer operation's status (comment: cancellation must respect
    /// the generation check on both the top-of-loop and the sleep paths).
    func testCancelledSupersededLoopStaysSilent() async {
        let clock = ManualSleepClock()
        let fake = FakeSafariReload(failuresBeforeSuccess: 1)
        let (manager, delegate) = self.makeManagerWithManualClock(
            reload: { _ in try await fake.reload() },
            clock: clock
        )

        // Stale operation: attempt 1 fails, its 1 s backoff is left pending.
        let staleOperation = Task { await manager.reloadContentBlocker(.general) }
        await clock.waitForNextSleep()

        // The newer operation supersedes the stale one and succeeds immediately.
        let newResult = await manager.reloadContentBlocker(.general)
        XCTAssertTrue(newResult)

        // Cancelling the stale operation resumes its backoff with
        // `CancellationError`.
        // Being superseded, the stale loop stays silent.
        staleOperation.cancel()
        let staleResult = await staleOperation.value

        XCTAssertFalse(staleResult)
        let attempts = await fake.attemptCount
        XCTAssertEqual(attempts, 2) // One call per operation; no retry from the stale loop.
        XCTAssertEqual(delegate.endResults.count, 1) // Only the newest operation reported an end.
        XCTAssertFalse(delegate.endResults.first?.isAborted ?? true)
        XCTAssertNil(delegate.endResults.first?.error)
    }
}
