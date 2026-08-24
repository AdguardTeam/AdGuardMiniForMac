// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  RetryPolicy.swift
//  AdguardMini
//

import Foundation

/// Pure decision logic for retrying a Safari content blocker reload.
///
/// Encapsulates the frozen attempt limit and exponential backoff schedule so the
/// reload manager stays small and the schedule is testable without real timers.
/// Stateless: 3 total attempts, base delay 1 s, doubled after each failure
/// (retries at 1 s then 2 s).
struct RetryPolicy {
    // MARK: Constants

    private enum Constants {
        static let maxAttempts = 3
        static let baseDelaySeconds: TimeInterval = 1
        static let delayMultiplier = 2
    }

    // MARK: Public

    /// Total number of reload attempts (initial attempt plus retries).
    var maxAttempts: Int {
        Constants.maxAttempts
    }

    /// Whether a retry may be attempted after the 1-based `failedAttempt`.
    /// - Parameter failedAttempt: The 1-based attempt number that just failed.
    /// - Returns: True while the attempt limit has not been reached.
    func shouldRetry(after failedAttempt: Int) -> Bool {
        failedAttempt < Constants.maxAttempts
    }

    /// Backoff delay (seconds) before the retry that follows the 1-based
    /// `failedAttempt`: 1 s after the first failure, 2 s after the second.
    /// - Parameter failedAttempt: The 1-based attempt number that just failed.
    /// - Returns: The delay in seconds.
    func delay(after failedAttempt: Int) -> TimeInterval {
        Constants.baseDelaySeconds
            * pow(Double(Constants.delayMultiplier), Double(failedAttempt - 1))
    }
}
