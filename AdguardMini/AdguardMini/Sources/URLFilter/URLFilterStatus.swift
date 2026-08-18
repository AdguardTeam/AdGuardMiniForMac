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
/// is bridged into this enum inside an availability guard, keeping the
/// ``URLFilterStatus/derive(rawStatus:isEnabled:hasValidConfiguration:errorMessage:)``
/// mapper available on any OS version.
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

// MARK: - URLFilterStatus

/// The derived, user-facing status of the URL filter.
enum URLFilterStatus: Equatable {
    /// Status is unknown, optionally with an error message.
    case unknown(errorMessage: String?)
    /// The filter is disabled (macOS < 26, or a valid configuration exists but is turned off).
    case disabled
    /// The configuration is invalid or the extension is not installed.
    case invalid
    /// The filter is stopped, optionally with an error message.
    case stopped(errorMessage: String?)
    /// The filter is starting.
    case starting
    /// The filter is running.
    case running
    /// The filter is stopping, optionally with an error message.
    case stopping(errorMessage: String?)

    /// Whether the status represents an enabled (running or starting) state.
    var isEnabled: Bool {
        switch self {
        case .running, .starting:
            true
        case .disabled, .invalid, .stopped, .stopping, .unknown:
            false
        }
    }
}

extension URLFilterStatus {
    /// Derives the user-facing status from the raw manager status.
    ///
    /// - Parameters:
    ///   - rawStatus: Platform-independent raw status.
    ///   - isEnabled: Whether the filter is marked as enabled in preferences.
    ///   - hasValidConfiguration: Whether a valid configuration is present.
    ///   - errorMessage: `lastDisconnectError` description, if any.
    /// - Returns: The derived ``URLFilterStatus``.
    static func derive(
        rawStatus: URLFilterRawStatus,
        isEnabled: Bool,
        hasValidConfiguration: Bool,
        errorMessage: String?
    ) -> URLFilterStatus {
        switch rawStatus {
        case .invalid:
            // A configured-but-off filter reports raw `.invalid`; surface it as `.disabled`.
            if hasValidConfiguration, !isEnabled {
                return .disabled
            }
            return .invalid
        case .stopped:
            return .stopped(errorMessage: errorMessage)
        case .starting:
            return .starting
        case .running:
            return .running
        case .stopping:
            return .stopping(errorMessage: errorMessage)
        case .unknown:
            return .unknown(errorMessage: errorMessage)
        }
    }
}
