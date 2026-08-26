// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterLevelConfiguration.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - Constants

private enum Constants {
    // MARK: PIR endpoints

    static let defaultPIRServerURL: URL = {
        #if DEBUG
        return URL(string: "https://pirgateway.service.agrd.dev")!
        #else
        // TODO: AG-57473 - Restore prod host below.
        // Commented-out code.
        // swiftlint:disable:next comments_capitalized_ignore_possible_code
        // return URL(string: "https://pirgateway.service.agrd.dev")!
        return URL(string: "https://pir-service.adtidy.org")!
        #endif
    }()

    static let defaultPrivacyPassIssuerURL: URL = {
        #if DEBUG
        return URL(string: "https://pirgateway.service.agrd.dev")!
        #else
        // TODO: AG-57473 - Restore prod issuer below.
        // Commented-out code.
        // swiftlint:disable:next comments_capitalized_ignore_possible_code
        // return URL(string: "https://pirgateway.service.agrd.dev")!
        return URL(string: "https://pir-issuer.adtidy.org")!
        #endif
    }()

    /// Bloom parameters URL for the given protection level.
    static func bloomParamsURL(for level: URLFilterProtectionLevel) -> URL {
        switch level {
        case .essential: URL(string: "https://filters.adtidy.org/pir/bloom-essential.json")!
        case .safe:      URL(string: "https://filters.adtidy.org/pir/bloom-safe.json")!
        case .family:    URL(string: "https://filters.adtidy.org/pir/bloom-family.json")!
        }
    }
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

// MARK: - Dev-config overrides

/// Dev-config overrides for ``URLFilterLevelConfiguration`` (`url_filter` key).
///
/// Mirrors `devConfig.json`; every field is optional and falls back to the
/// compiled-in defaults when unset. `internal` so the pure override logic
/// (`apply(_:to:in:)`) can be covered by unit tests.
struct URLFilterLevelOverrides: Decodable {
    /// Per-level overrides; unset fields keep the compiled-in defaults.
    struct Level: Decodable {
        var pirServerURL: URL?
        var pirPrivacyPassIssuerURL: URL?
        var pirAuthenticationToken: String?
        var bloomParamsURL: URL?

        enum CodingKeys: String, CodingKey {
            case pirServerURL = "pir_server_url"
            case pirPrivacyPassIssuerURL = "pir_privacy_pass_issuer_url"
            case pirAuthenticationToken = "pir_authentication_token"
            case bloomParamsURL = "bloom_params_url"
        }
    }

    var essential: Level?
    var safe: Level?
    var family: Level?
}

// MARK: - Defaults

extension URLFilterLevelConfiguration {
    /// Effective configurations used by the live services.
    ///
    /// Built from the compiled-in defaults (``compiledDefaultLevels``) with
    /// dev-config overrides applied on top when present.
    static let defaultLevels: [URLFilterProtectionLevel: URLFilterLevelConfiguration] = {
        var levels = Self.compiledDefaultLevels
        Self.applyDevConfigOverrides(to: &levels)
        return levels
    }()

    /// Compiled-in configurations indexed by protection level.
    ///
    /// Independent of the environment: no dev-config is consulted here, so
    /// these are safe to assert in unit tests. Tokens are opaque per-level
    /// values generated from the compiled-in payload. URLs can be overridden
    /// at runtime via dev-config; see ``Constants/defaultPIRServerURL`` for
    /// the current Debug/Release policy.
    static let compiledDefaultLevels: [URLFilterProtectionLevel: URLFilterLevelConfiguration] = {
        var levels: [URLFilterProtectionLevel: URLFilterLevelConfiguration] = [:]
        for level in URLFilterProtectionLevel.allCases {
            levels[level] = URLFilterLevelConfiguration(
                pirServerURL: Constants.defaultPIRServerURL,
                pirPrivacyPassIssuerURL: Constants.defaultPrivacyPassIssuerURL,
                pirAuthenticationToken: Self.token(for: level),
                bloomParamsURL: Constants.bloomParamsURL(for: level)
            )
        }
        return levels
    }()

    /// Applies dev-config overrides on top of the compiled-in defaults.
    ///
    /// Reads the `url_filter` key of `devConfig.json`, a dictionary keyed by
    /// protection level (`essential`, `safe`, `family`). Each entry may contain
    /// the `pir_server_url`, `pir_privacy_pass_issuer_url`,
    /// `pir_authentication_token` and `bloom_params_url` fields. Unset fields
    /// keep the compiled-in defaults.
    ///
    /// **devConfig.json format:**
    /// ```json
    /// {
    ///   "url_filter": {
    ///     "essential": {
    ///       "pir_server_url": "https://...",
    ///       "pir_privacy_pass_issuer_url": "https://...",
    ///       "pir_authentication_token": "...",
    ///       "bloom_params_url": "https://..."
    ///     }
    ///   }
    /// }
    /// ```
    ///
    /// - Parameter levels: The configurations to mutate in place.
    private static func applyDevConfigOverrides(
        to levels: inout [URLFilterProtectionLevel: URLFilterLevelConfiguration]
    ) {
        guard let overrides = Self.decodeOverrides() else { return }
        var appliedLevels: [String] = []
        if Self.apply(overrides.essential, to: .essential, in: &levels) {
            appliedLevels.append(Self.name(of: .essential))
        }
        if Self.apply(overrides.safe, to: .safe, in: &levels) {
            appliedLevels.append(Self.name(of: .safe))
        }
        if Self.apply(overrides.family, to: .family, in: &levels) {
            appliedLevels.append(Self.name(of: .family))
        }
        if !appliedLevels.isEmpty {
            LogInfo("[DevConfig] URL filter overrides active for: \(appliedLevels.joined(separator: ", "))")
        }
    }

    /// Applies the overrides of a single protection level, if present.
    ///
    /// The `levels` dictionary is mutated in place; unset field overrides keep
    /// the current values. `internal` (with the overrides type) so the pure
    /// override logic can be covered by unit tests without touching the
    /// file-backed `DeveloperConfigUtils`.
    ///
    /// - Returns: `true` if at least one field was overridden.
    static func apply(
        _ overrides: URLFilterLevelOverrides.Level?,
        to level: URLFilterProtectionLevel,
        in levels: inout [URLFilterProtectionLevel: URLFilterLevelConfiguration]
    ) -> Bool {
        guard let overrides, var current = levels[level] else { return false }
        if let url = overrides.pirServerURL { current.pirServerURL = url }
        if let url = overrides.pirPrivacyPassIssuerURL { current.pirPrivacyPassIssuerURL = url }
        if let token = overrides.pirAuthenticationToken { current.pirAuthenticationToken = token }
        if let url = overrides.bloomParamsURL { current.bloomParamsURL = url }
        levels[level] = current
        return overrides.pirServerURL != nil
            || overrides.pirPrivacyPassIssuerURL != nil
            || overrides.pirAuthenticationToken != nil
            || overrides.bloomParamsURL != nil
    }

    /// Decodes the `url_filter` dev-config value, if present.
    private static func decodeOverrides() -> URLFilterLevelOverrides? {
        guard let raw = DeveloperConfigUtils[.urlFilterLevelOverrides],
              let data = try? JSONSerialization.data(withJSONObject: raw) else {
            return nil
        }
        return try? JSONDecoder().decode(URLFilterLevelOverrides.self, from: data)
    }

    /// Display/database name of a protection level, used for logs and tokens.
    private static func name(of level: URLFilterProtectionLevel) -> String {
        switch level {
        case .essential: "essential"
        case .safe:      "safe"
        case .family:    "family"
        }
    }

    /// Opaque PIR bearer token for the given protection level.
    ///
    /// The payload format is a backend-internal detail (base64 of
    /// `{"db":"<database>"}`) and is kept private so the app does not depend
    /// on the PIR service's naming.
    private static func token(for level: URLFilterProtectionLevel) -> String {
        let payload = PIRAuthenticationTokenPayload(db: Self.name(of: level))
        let data = try? JSONEncoder().encode(payload)
        return data?.base64EncodedString() ?? ""
    }
}

// MARK: - PIR token payload

/// JSON payload encoded into a PIR bearer token.
///
/// Backend-internal detail; more fields can be added later without changing
/// token consumers.
private struct PIRAuthenticationTokenPayload: Encodable {
    var db: String
}
