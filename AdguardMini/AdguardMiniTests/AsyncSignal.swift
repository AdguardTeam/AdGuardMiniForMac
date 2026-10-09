// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AsyncSignal.swift
//  AdguardMiniTests
//

import Foundation

/// Lets one side of a test wait until the other side signals; a signal already
/// sent is never lost, so a late waiter does not hang.
final class AsyncSignal: @unchecked Sendable {
    private let lock = NSLock()
    private var continuations: [CheckedContinuation<Void, Never>] = []
    private var isSignaled = false

    func wait() async {
        await withCheckedContinuation { continuation in
            self.lock.lock()
            if self.isSignaled {
                self.lock.unlock()
                continuation.resume()
            } else {
                self.continuations.append(continuation)
                self.lock.unlock()
            }
        }
    }

    func signal() {
        self.lock.lock()
        self.isSignaled = true
        let continuations = self.continuations
        self.continuations = []
        self.lock.unlock()
        for continuation in continuations {
            continuation.resume()
        }
    }
}
