// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterConfiguration.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - Constants

private enum Constants {
    static let minPrefilterFetchInterval: TimeInterval = 45.minutes
}

// MARK: - URLFilterConfiguration

/// User-facing URL filter configuration exposed by ``URLFilterService``.
///
/// The PIR server URL, token, and bloom-parameter URL are no longer stored
/// directly in this struct. Instead each ``URLFilterProtectionLevel`` carries
/// its own set of endpoints via ``URLFilterLevelConfiguration/defaultLevels``.
/// ``URLFilterService`` picks the right one when creating the configuration.
struct URLFilterConfiguration: Equatable {
    /// Chosen protection level. Determines which token and endpoints are used.
    var protectionLevel: URLFilterProtectionLevel
    /// Bloom filter update interval.
    var prefilterFetchInterval: TimeInterval
    /// When `true`, block the URL on a PIR request error.
    var shouldFailClosed: Bool
    /// Whether the filter is enabled.
    var enabled: Bool

    /// Creates a configuration with sensible defaults.
    init(
        protectionLevel: URLFilterProtectionLevel,
        prefilterFetchInterval: TimeInterval = Constants.minPrefilterFetchInterval,
        shouldFailClosed: Bool = false,
        enabled: Bool = false
    ) {
        self.protectionLevel = protectionLevel
        self.prefilterFetchInterval = prefilterFetchInterval
        self.shouldFailClosed = shouldFailClosed
        self.enabled = enabled
    }
}
