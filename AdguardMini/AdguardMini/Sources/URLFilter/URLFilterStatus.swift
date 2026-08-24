// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStatus.swift
//  AdguardMini
//

import Foundation

// MARK: - URLFilterRawStatus

/// Platform-independent mirror of `NEURLFilterManager.Status`.
///
/// `NEURLFilterManager.Status` is only available on macOS 26+, so the raw value
/// is bridged into this enum inside an availability guard, keeping the mapper available on any OS version.
enum URLFilterRawStatus {
    /// The extension is not installed or the configuration is invalid.
    case invalid
    /// The filter is stopped.
    case stopped
    /// The filter is starting.
    case starting
    /// The filter is running.
    case running
    /// The filter is stopping.
    case stopping
    /// An unrecognized (`@unknown`) raw status.
    case unknown
}
