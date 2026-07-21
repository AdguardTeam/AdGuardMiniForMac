// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterLevelConfiguration.swift
//  AdguardMini
//

import Foundation

// MARK: - Constants

private enum Constants {
    static let defaultPIRServerURL: URL = URL(string: "https://pir-service.adtidy.org")!
    static let defaultPrivacyPassIssuerURL: URL = URL(string: "https://pir-issuer.adtidy.org")!
    // TODO: AG-56649 fill with real bloom params URLs for all protection levels
    static let bloomParamsURLEssential: URL = URL(
        string: "https://example.com/bloom/bloom-params.json"
    )!
    static let bloomParamsURLSafe: URL = Self.bloomParamsURLEssential
    static let bloomParamsURLFamily: URL = Self.bloomParamsURLEssential
}

// MARK: - URLFilterLevelConfiguration

/// Per-protection-level parameters for the URL filter.
///
/// Each ``URLFilterProtectionLevel`` (essential, safe, family) uses a distinct
/// PIR token and bloom-parameter URL so the backend can apply different
/// filtering scopes per tier.
struct URLFilterLevelConfiguration: Equatable {
    /// PIR server URL for obtaining accurate verdicts.
    var pirServerURL: URL
    /// Privacy Pass issuer URL for anonymous authentication.
    var pirPrivacyPassIssuerURL: URL?
    /// Bearer token for authenticating with the PIR server.
    var pirAuthenticationToken: String
    /// URL for downloading the bloom filter parameters JSON.
    var bloomParamsURL: URL
}

// MARK: - Defaults

extension URLFilterLevelConfiguration {
    /// Known-good configurations indexed by protection level.
    ///
    /// The values for ``.safe`` and ``.family`` are placeholders and MUST be
    /// replaced with real tokens and URLs before release.
    static let defaultLevels: [URLFilterProtectionLevel: URLFilterLevelConfiguration] = [
        .essential: URLFilterLevelConfiguration(
            pirServerURL: Constants.defaultPIRServerURL,
            pirPrivacyPassIssuerURL: Constants.defaultPrivacyPassIssuerURL,
            pirAuthenticationToken: "", // TODO: AG-56649 fill the essential token
            bloomParamsURL: Constants.bloomParamsURLEssential
        ),

        .safe: URLFilterLevelConfiguration(
            pirServerURL: Constants.defaultPIRServerURL,
            pirPrivacyPassIssuerURL: Constants.defaultPrivacyPassIssuerURL,
            pirAuthenticationToken: "", // TODO: AG-56649 fill the safe token
            bloomParamsURL: Constants.bloomParamsURLSafe
        ),

        .family: URLFilterLevelConfiguration(
            pirServerURL: Constants.defaultPIRServerURL,
            pirPrivacyPassIssuerURL: Constants.defaultPrivacyPassIssuerURL,
            pirAuthenticationToken: "", // TODO: AG-56649 fill the family token
            bloomParamsURL: Constants.bloomParamsURLFamily
        )
    ]
}
