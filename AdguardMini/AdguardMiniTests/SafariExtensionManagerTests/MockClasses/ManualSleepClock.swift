// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ManualSleepClock.swift
//  AdguardMiniTests
//

import Foundation
import AML

/// Deterministic, blocking sleep for the manager tests. Each requested delay is
/// recorded, then the caller suspends until `releaseSleep()` completes it or the
/// task is cancelled (resumed with `CancellationError`). Mirrors
/// `ThrottlerTests.ManualClock` so the retry loop can be driven step by step
/// with a retry left pending while the test starts a newer operation.
final class ManualSleepClock: @unchecked Sendable {
    private let lock = UnfairLock()
    private var recorded: [TimeInterval] = []
    private var pendingResume: CheckedContinuation<Void, Error>?
    private var sleepRegistered: CheckedContinuation<Void, Never>?

    /// Every delay the clock has been asked to sleep for, in order.
    var recordedDelays: [TimeInterval] {
        locked(self.lock) { self.recorded }
    }

    /// Injected as the manager's `sleep`. Suspends until `releaseSleep()` or
    /// task cancellation.
    func sleep(_ delay: TimeInterval) async throws {
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
                let waiter: CheckedContinuation<Void, Never>? = locked(self.lock) {
                    self.recorded.append(delay)
                    self.pendingResume = cont
                    let registered = self.sleepRegistered
                    self.sleepRegistered = nil
                    return registered
                }
                waiter?.resume()
            }
        } onCancel: {
            let cont: CheckedContinuation<Void, Error>? = locked(self.lock) {
                let pending = self.pendingResume
                self.pendingResume = nil
                return pending
            }
            cont?.resume(throwing: CancellationError())
        }
    }

    /// Suspends until the manager has registered its next pending sleep.
    func waitForNextSleep() async {
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            let ready: Bool = locked(self.lock) {
                if self.pendingResume != nil { return true }
                self.sleepRegistered = cont
                return false
            }
            if ready { cont.resume() }
        }
    }

    /// Completes the currently pending sleep, letting the retry loop resume.
    func releaseSleep() {
        let cont: CheckedContinuation<Void, Error>? = locked(self.lock) {
            let pending = self.pendingResume
            self.pendingResume = nil
            return pending
        }
        cont?.resume()
    }
}
