// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LogRecorder.swift
//  AdguardMiniTests
//

import Foundation
import AML

/// Collects the messages a `SafariExtensionManagerImpl` routes through its
/// injected `logError:` sink, mirroring `ReloadDelegateSpy` (lock-guarded
/// storage), so tests can assert the exhaustion log is emitted exactly once
/// per failed blocker.
final class LogRecorder: @unchecked Sendable {
    private let lock = UnfairLock()
    private var storedMessages: [String] = []

    /// The messages routed through `log(_:)`, in order.
    var messages: [String] {
        locked(self.lock) { self.storedMessages }
    }

    /// Records one message for later assertion.
    func log(_ message: String) {
        locked(self.lock) { self.storedMessages.append(message) }
    }
}
