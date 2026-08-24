// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterServiceError.swift
//  AdguardMini
//

import Foundation

// MARK: - URLFilterServiceError

/// Errors thrown by ``URLFilterService`` operations.
enum URLFilterServiceError: Error, LocalizedError, CustomStringConvertible {
    /// The current OS is older than macOS 26, where `NEURLFilterManager` is unavailable.
    case unsupportedPlatform
    /// No configuration is saved in System Settings.
    case configurationMissing
    /// Saving the configuration failed.
    case saveFailed(Error)
    /// Loading the configuration failed.
    case loadFailed(Error)
    /// Removing the configuration failed.
    case removeFailed(Error)
    /// Enabling or disabling the filter failed.
    case setEnabledFailed(Error)
    /// Resetting the prefilter cache failed.
    case resetCacheFailed(Error)

    /// The error message surfaced to logs.
    var errorDescription: String? { self.description }

    /// A human-readable description that includes the underlying system error.
    var description: String {
        switch self {
        case .unsupportedPlatform:
            "URLFilter is unsupported on this macOS version"
        case .configurationMissing:
            "URLFilter configuration is missing in System Settings"
        case let .saveFailed(error):
            "URLFilter configuration save failed: \(error)"
        case let .loadFailed(error):
            "URLFilter configuration load failed: \(error)"
        case let .removeFailed(error):
            "URLFilter configuration removal failed: \(error)"
        case let .setEnabledFailed(error):
            "URLFilter enable/disable failed: \(error)"
        case let .resetCacheFailed(error):
            "URLFilter prefilter cache reset failed: \(error)"
        }
    }
}
