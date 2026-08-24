// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  RecordingClock.swift
//  AdguardMiniTests
//

import Foundation

/// Deterministic sleep source for tests: records every requested delay and
/// returns immediately, so the retry schedule runs without wall-clock waits.
/// Mirrors the `ManualClock` in `ThrottlerTests`, simplified for the manager's
/// strictly sequential retry loop (at most two pending sleeps, each fully
/// awaited before the next attempt).
actor RecordingClock {
    private(set) var recordedDelays: [TimeInterval] = []

    /// Appends `delay` and returns immediately.
    func sleep(_ delay: TimeInterval) async throws {
        self.recordedDelays.append(delay)
    }
}
