// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  RecurringRpcTimeoutMonitor.swift
//  AdguardMini
//

import Foundation

/// Tracks consecutive RPC timeouts.
final class RecurringRpcTimeoutMonitor {
    private enum Constants {
        static let defaultThreshold = 3
    }

    private let threshold: Int

    /// Exposed for tests.
    private(set) var consecutiveTimeouts = 0

    private var alertShownThisCycle = false

    init(threshold: Int = Constants.defaultThreshold) {
        self.threshold = threshold
    }

    /// Records timeout and returns whether to surface alert.
    @discardableResult
    func recordTimeout() -> Bool {
        consecutiveTimeouts += 1
        // Alert once after threshold, until success resets cycle.
        guard consecutiveTimeouts >= threshold, !alertShownThisCycle else {
            return false
        }
        alertShownThisCycle = true
        return true
    }

    /// Records success and resets timeout state.
    func recordSuccess() {
        consecutiveTimeouts = 0
        alertShownThisCycle = false
    }
}
