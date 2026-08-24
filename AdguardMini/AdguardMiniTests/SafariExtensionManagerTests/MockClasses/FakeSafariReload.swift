// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FakeSafariReload.swift
//  AdguardMiniTests
//

import Foundation

/// Controllable stand-in for `SFContentBlockerManager.reloadContentBlocker`.
///
/// Fails the first `failuresBeforeSuccess` calls, then succeeds. Passing `nil`
/// makes every call fail, so the exhaustion path is deterministically
/// reproducible.
actor FakeSafariReload {
    private struct ReloadFailure: Error {}

    private let failuresBeforeSuccess: Int?
    private(set) var attemptCount = 0

    /// - Parameter failuresBeforeSuccess: Number of initial calls to fail, or
    ///   `nil` to fail every call.
    init(failuresBeforeSuccess: Int?) {
        self.failuresBeforeSuccess = failuresBeforeSuccess
    }

    func reload() throws {
        self.attemptCount += 1
        if let failuresBeforeSuccess,
           self.attemptCount > failuresBeforeSuccess {
            return
        }
        throw ReloadFailure()
    }
}
