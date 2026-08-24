// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TokenBucketLimiter.swift
//  AdguardMini
//

import Foundation

/// Thread-safe token-bucket limiter for page-to-native message bursts.
final class TokenBucketLimiter {
    /// Outcome of a `tryConsume()` call.
    enum Decision: Equatable {
        case allowed
        case limited(shouldLog: Bool)
    }

    private let capacity: Double
    private let refillPerSecond: Double
    private let now: () -> TimeInterval
    private let lock = NSLock()
    private var tokens: Double
    private var lastRefill: TimeInterval
    private var hasLoggedLimit = false

    /// Creates a limiter.
    /// - Parameters:
    ///   - capacity: Maximum burst size (tokens). Must be finite and >= 1.
    ///   - refillPerSecond: Continuous refill rate (tokens per second).
    ///     Must be finite and positive.
    ///   - now: Injectable monotonic clock (seconds since boot) for
    ///     deterministic tests; defaults to `ProcessInfo.processInfo.systemUptime`
    ///     so wall-clock jumps (NTP sync, manual change, DST) cannot instantly
    ///     refill the bucket or freeze refills — this is a security boundary
    ///     against untrusted web content.
    init(
        capacity: Double,
        refillPerSecond: Double,
        now: @escaping () -> TimeInterval = { ProcessInfo.processInfo.systemUptime }
    ) {
        precondition(capacity >= 1 && capacity.isFinite, "capacity must be a finite value >= 1")
        precondition(refillPerSecond > 0 && refillPerSecond.isFinite, "refillPerSecond must be a finite positive value")
        self.capacity = capacity
        self.refillPerSecond = refillPerSecond
        self.now = now
        self.tokens = capacity
        self.lastRefill = now()
    }

    /// Tries to consume one token.
    /// - Returns: `.allowed` or `.limited(shouldLog:)`.
    func tryConsume() -> Decision {
        lock.lock()
        defer { lock.unlock() }

        let current = now()
        let elapsed = current - lastRefill
        if elapsed > 0 {
            tokens = min(capacity, tokens + elapsed * refillPerSecond)
            lastRefill = current
        }

        if tokens >= 1 {
            tokens -= 1
            hasLoggedLimit = false
            return .allowed
        }
        // Set the flag explicitly (rather than relying on a `defer`) so the
        // Once-per-episode logging semantics are obvious and resilient to
        // Future edits.
        let shouldLog = !hasLoggedLimit
        hasLoggedLimit = true
        return .limited(shouldLog: shouldLog)
    }
}
