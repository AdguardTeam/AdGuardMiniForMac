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
enum URLFilterServiceError: Error {
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
}

extension URLFilterStatus {
    /// The error text carried by the status, if any.
    /// Surfaced on `URLFilterState.error_message` because proto enums cannot
    /// hold payloads.
    var errorMessage: String? {
        switch self {
        case let .unknown(errorMessage):  errorMessage
        case let .stopped(errorMessage):  errorMessage
        case let .stopping(errorMessage): errorMessage
        case .disabled, .invalid, .starting, .running: nil
        }
    }
}
