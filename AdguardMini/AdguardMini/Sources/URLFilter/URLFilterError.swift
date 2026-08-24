// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStatus.swift
//  AdguardMini
//

// MARK: - URLFilterError

/// Platform-independent mirror of `NEURLFilterManager.Error`.
///
/// `NEURLFilterManager.Error` is only available on macOS 26+, so the raw value
/// is bridged into this enum inside an availability guard, keeping the mapper available on any OS version.
enum URLFilterError: Error {
    /// The filter configuration is unchanged.
    case configurationUnchanged

    /// The filter configuration is invalid.
    case configurationInvalid

    /// The filter configuration is disabled.
    case configurationDisabled

    /// The filter configuration needs to be loaded.
    case configurationStale

    /// The filter configuration cannot be removed.
    case configurationCannotBeRemoved

    /// Operation permission denied.
    case configurationPermissionDenied

    /// An internal configuration error occurred.
    case configurationInternalError

    /// Configuration has not been loaded.
    case configurationNotLoaded

    /// PIR Server or/and OHTTP Private Relay setup incomplete.
    case serverSetupIncomplete

    /// An internal error occurred.
    case internalError

    /// The app extension cancelled the feature bringup.
    case extensionCancelled

    /// The app extension is not found.
    case extensionNotFound

    /// The app extension failed to load.
    case extensionFailedToLoad

    /// Unknown error.
    case unknown
}
