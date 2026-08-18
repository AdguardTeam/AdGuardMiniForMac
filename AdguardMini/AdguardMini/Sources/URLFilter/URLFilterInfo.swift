// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterInfo.swift
//  AdguardMini
//

import Foundation

// MARK: - URLFilterInfo

/// Read-only URL filter metadata surfaced to the UI.
///
/// `rulesCount` and `lastUpdate` are populated from the bloom metadata
/// persisted by the URL filter extension; they stay `nil` until the
/// prefilter has been fetched at least once.
struct URLFilterInfo: Equatable {
    /// Number of rules in the active prefilter, if known.
    var rulesCount: Int?
    /// Timestamp of the last prefilter update, if known.
    var lastUpdate: Date?
    /// Whether a first-time installation is currently in progress.
    var isInstalling: Bool

    /// Creates URL filter metadata.
    init(rulesCount: Int? = nil, lastUpdate: Date? = nil, isInstalling: Bool = false) {
        self.rulesCount = rulesCount
        self.lastUpdate = lastUpdate
        self.isInstalling = isInstalling
    }
}
