// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ReloadDelegateSpy.swift
//  AdguardMiniTests
//

import Foundation
import AML

/// Records `ReloadExtensionDelegate` callbacks so tests can assert how many
/// times the manager reported a reload start/end and with what error.
final class ReloadDelegateSpy: ReloadExtensionDelegate, @unchecked Sendable {
    private let lock = UnfairLock()
    private var storedStartCount = 0
    private var storedResults: [ReloadExtensionResult] = []

    /// Number of `onStartReload` calls received.
    var startCount: Int {
        locked(self.lock) { self.storedStartCount }
    }

    /// The `onEndReload` results received, in order.
    var endResults: [ReloadExtensionResult] {
        locked(self.lock) { self.storedResults }
    }

    func onStartReload(blockerType: SafariBlockerType) async {
        locked(self.lock) { self.storedStartCount += 1 }
    }

    func onEndReload(_ result: ReloadExtensionResult) async {
        locked(self.lock) { self.storedResults.append(result) }
    }
}
