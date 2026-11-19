// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  OneShotReply.swift
//  AdguardMini
//

import AML

/// Delivers an XPC reply at most once.
enum OneShotReply {
    /// Returns a copy of `reply` that forwards only its first call.
    ///
    /// A reply channel can report a transport failure and a late response for one request.
    static func make<each Argument>(
        _ reply: @escaping @Sendable (repeat each Argument) -> Void
    ) -> @Sendable (repeat each Argument) -> Void {
        let state = State()
        return { (arguments: repeat each Argument) in
            guard state.claim() else {
                return
            }
            reply(repeat each arguments)
        }
    }

    /// Holds the delivered flag of one guarded reply.
    ///
    /// The unchecked conformance is safe because `claim()` touches the flag only under the lock.
    private final class State: @unchecked Sendable {
        private let lock = UnfairLock()
        private var delivered = false

        /// Claims the reply delivery; returns `true` to exactly one caller.
        func claim() -> Bool {
            locked(self.lock) {
                guard !self.delivered else {
                    return false
                }
                self.delivered = true
                return true
            }
        }
    }
}
