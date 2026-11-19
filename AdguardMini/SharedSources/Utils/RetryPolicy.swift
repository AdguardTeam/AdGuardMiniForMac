// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  RetryPolicy.swift
//  AdguardMini
//

import Foundation

/// Bounded exponential retry schedule for an operation that can fail transiently.
///
/// Defaults: 3 total attempts, base delay 1 s, doubled after each failure.
struct RetryPolicy {
    // MARK: Constants

    private enum Constants {
        static let delayMultiplier = 2
    }

    // MARK: Public

    /// Total number of attempts (initial attempt plus retries).
    let maxAttempts: Int

    /// Delay in seconds before the first retry; doubled after each later failure.
    private let baseDelaySeconds: TimeInterval

    /// Creates a policy with the given attempt limit and base delay.
    /// - Parameters:
    ///   - maxAttempts: Total number of attempts, the initial one included.
    ///   - baseDelaySeconds: Delay in seconds before the first retry.
    init(maxAttempts: Int = 3, baseDelaySeconds: TimeInterval = 1) {
        self.maxAttempts = maxAttempts
        self.baseDelaySeconds = baseDelaySeconds
    }

    /// Whether a retry may be attempted after the 1-based `failedAttempt`.
    /// - Parameter failedAttempt: The 1-based attempt number that just failed.
    /// - Returns: True while the attempt limit has not been reached.
    func shouldRetry(after failedAttempt: Int) -> Bool {
        failedAttempt < self.maxAttempts
    }

    /// Backoff delay (seconds) before the retry that follows the 1-based
    /// `failedAttempt`: the base delay doubled once per earlier failure.
    /// - Parameter failedAttempt: The 1-based attempt number that just failed.
    /// - Returns: The delay in seconds.
    func delay(after failedAttempt: Int) -> TimeInterval {
        self.baseDelaySeconds
            * pow(Double(Constants.delayMultiplier), Double(failedAttempt - 1))
    }
}
