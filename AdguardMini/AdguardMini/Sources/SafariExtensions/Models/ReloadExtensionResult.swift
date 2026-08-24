// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ReloadExtensionResult.swift
//  AdguardMini
//

import Foundation

struct ReloadExtensionResult {
    let blockerType: SafariBlockerType
    let error: Error?

    /// Whether the reload never reached Safari because its task was cancelled.
    ///
    /// An aborted reload must still release the in-progress flag, but it must
    /// not rewrite the stored status: no actual reload happened, so the
    /// previously persisted state (including any `.safariError`) stays valid.
    let isAborted: Bool

    init(
        blockerType: SafariBlockerType,
        error: Error?,
        isAborted: Bool = false
    ) {
        self.blockerType = blockerType
        self.error = error
        self.isAborted = isAborted
    }
}
