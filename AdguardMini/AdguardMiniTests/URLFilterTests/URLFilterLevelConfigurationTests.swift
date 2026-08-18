// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterLevelConfigurationTests.swift
//  AdguardMiniTests
//

import XCTest

/// Verifies the compiled-in per-level URL filter configurations:
/// endpoint consistency, bloom-parameter URLs, and PIR token payloads.
///
/// Uses the compiled defaults (``URLFilterLevelConfiguration/compiledDefaultLevels``),
/// never the dev-config-affected ``URLFilterLevelConfiguration/defaultLevels``,
/// so the tests stay independent of any `devConfig.json` on the machine.
final class URLFilterLevelConfigurationTests: XCTestCase {
    /// Database name expected inside the PIR token payload, per protection level.
    private let tokenDatabaseNames: [URLFilterProtectionLevel: String] = [
        .essential: "essential",
        .safe: "safe",
        .family: "family"
    ]

    func testDefaultLevelsContainEveryProtectionLevel() {
        let levels = URLFilterLevelConfiguration.compiledDefaultLevels

        XCTAssertEqual(levels.count, URLFilterProtectionLevel.allCases.count)
        for level in URLFilterProtectionLevel.allCases {
            XCTAssertNotNil(levels[level], "Missing configuration for level \(level)")
        }
    }

    func testAllLevelsShareTheSamePIREndpoints() {
        let levels = URLFilterLevelConfiguration.compiledDefaultLevels

        let serverURLs = Set(levels.values.map(\.pirServerURL))
        XCTAssertEqual(serverURLs.count, 1, "All levels must use the same PIR server URL")

        let issuerURLs = Set(levels.values.compactMap(\.pirPrivacyPassIssuerURL))
        XCTAssertEqual(issuerURLs.count, 1, "All levels must use the same Privacy Pass issuer URL")

        for level in URLFilterProtectionLevel.allCases {
            let configuration = levels[level]
            XCTAssertEqual(configuration?.pirServerURL.scheme, "https")
            XCTAssertEqual(configuration?.pirPrivacyPassIssuerURL?.scheme, "https")
        }
    }

    func testBloomParamsURLIsDistinctPerLevel() {
        let levels = URLFilterLevelConfiguration.compiledDefaultLevels
        let expected: [URLFilterProtectionLevel: String] = [
            .essential: "https://filters.adtidy.org/pir/bloom-essential.json",
            .safe: "https://filters.adtidy.org/pir/bloom-safe.json",
            .family: "https://filters.adtidy.org/pir/bloom-family.json"
        ]

        for (level, urlString) in expected {
            XCTAssertEqual(
                levels[level]?.bloomParamsURL.absoluteString,
                urlString,
                "Unexpected bloom params URL for level \(level)"
            )
        }
    }

    func testAuthenticationTokensAreUniqueAndNonEmpty() {
        let levels = URLFilterLevelConfiguration.compiledDefaultLevels
        let tokens = URLFilterProtectionLevel.allCases.compactMap { levels[$0]?.pirAuthenticationToken }

        XCTAssertEqual(tokens.count, URLFilterProtectionLevel.allCases.count)
        XCTAssertFalse(tokens.contains(""), "Tokens must not be empty")
        XCTAssertEqual(Set(tokens).count, tokens.count, "Tokens must be unique per level")
    }

    func testAuthenticationTokenEncodesTheLevelDatabaseName() throws {
        let levels = URLFilterLevelConfiguration.compiledDefaultLevels

        for level in URLFilterProtectionLevel.allCases {
            let configuration = try XCTUnwrap(levels[level])
            let payloadData = try XCTUnwrap(
                Data(base64Encoded: configuration.pirAuthenticationToken),
                "Token for level \(level) is not valid base64"
            )
            let payload = try XCTUnwrap(
                try JSONSerialization.jsonObject(with: payloadData) as? [String: String],
                "Token payload for level \(level) is not a string dictionary"
            )

            XCTAssertEqual(payload["db"], self.tokenDatabaseNames[level])
        }
    }
}

// MARK: - Dev-config overrides

extension URLFilterLevelConfigurationTests {
    /// Builds a default configuration to apply overrides on top of.
    private func makeDefaultConfiguration() -> URLFilterLevelConfiguration {
        URLFilterLevelConfiguration(
            pirServerURL: URL(string: "https://default.example")!,
            pirPrivacyPassIssuerURL: URL(string: "https://issuer.example")!,
            pirAuthenticationToken: "default-token",
            bloomParamsURL: URL(string: "https://bloom.example")!
        )
    }

    /// Builds a dictionary with a single `.essential` keyed configuration.
    private func makeLevelsDictionary() -> [URLFilterProtectionLevel: URLFilterLevelConfiguration] {
        [.essential: self.makeDefaultConfiguration()]
    }

    func testApplyOverridesWithPartialFieldsFallsBackToDefaults() {
        let defaults = self.makeDefaultConfiguration()
        var levels = self.makeLevelsDictionary()

        let overrides = URLFilterLevelOverrides.Level(
            pirServerURL: URL(string: "https://override.example")!,
            pirPrivacyPassIssuerURL: nil,
            pirAuthenticationToken: "override-token",
            bloomParamsURL: nil
        )

        let applied = URLFilterLevelConfiguration.apply(overrides, to: .essential, in: &levels)

        XCTAssertTrue(applied, "Partial overrides must report that a field was applied")
        XCTAssertEqual(levels[.essential]?.pirServerURL, URL(string: "https://override.example")!)
        XCTAssertEqual(levels[.essential]?.pirAuthenticationToken, "override-token")
        XCTAssertEqual(
            levels[.essential]?.pirPrivacyPassIssuerURL, defaults.pirPrivacyPassIssuerURL,
            "Omitted override must keep the default issuer URL"
        )
        XCTAssertEqual(
            levels[.essential]?.bloomParamsURL, defaults.bloomParamsURL,
            "Omitted override must keep the default bloom params URL"
        )
    }

    func testApplyOverridesWithAllFieldsOverridesEverything() {
        var levels = self.makeLevelsDictionary()
        let overrides = URLFilterLevelOverrides.Level(
            pirServerURL: URL(string: "https://override.example")!,
            pirPrivacyPassIssuerURL: URL(string: "https://issuer-override.example")!,
            pirAuthenticationToken: "override-token",
            bloomParamsURL: URL(string: "https://bloom-override.example")!
        )

        let applied = URLFilterLevelConfiguration.apply(overrides, to: .essential, in: &levels)

        XCTAssertTrue(applied)
        XCTAssertEqual(levels[.essential]?.pirServerURL, overrides.pirServerURL)
        XCTAssertEqual(levels[.essential]?.pirPrivacyPassIssuerURL, overrides.pirPrivacyPassIssuerURL)
        XCTAssertEqual(levels[.essential]?.pirAuthenticationToken, overrides.pirAuthenticationToken)
        XCTAssertEqual(levels[.essential]?.bloomParamsURL, overrides.bloomParamsURL)
    }

    func testApplyOverridesWithAllNilFieldsKeepsConfiguration() {
        let defaults = self.makeDefaultConfiguration()
        var levels = self.makeLevelsDictionary()
        let overrides = URLFilterLevelOverrides.Level(
            pirServerURL: nil,
            pirPrivacyPassIssuerURL: nil,
            pirAuthenticationToken: nil,
            bloomParamsURL: nil
        )

        let applied = URLFilterLevelConfiguration.apply(overrides, to: .essential, in: &levels)

        XCTAssertFalse(applied, "Empty overrides must not report as applied")
        XCTAssertEqual(levels[.essential], defaults, "Empty overrides must not change the configuration")
    }

    func testApplyOverridesWithNilSkipsTheLevel() {
        let defaults = self.makeDefaultConfiguration()
        var levels = self.makeLevelsDictionary()

        let applied = URLFilterLevelConfiguration.apply(nil, to: .essential, in: &levels)

        XCTAssertFalse(applied, "Nil overrides must not report as applied")
        XCTAssertEqual(levels[.essential], defaults, "Nil overrides must not change the configuration")
    }

    func testApplyOverridesForMissingLevelReportsNotApplied() {
        var levels: [URLFilterProtectionLevel: URLFilterLevelConfiguration] = [:]
        let overrides = URLFilterLevelOverrides.Level(
            pirServerURL: URL(string: "https://override.example")!,
            pirPrivacyPassIssuerURL: nil,
            pirAuthenticationToken: nil,
            bloomParamsURL: nil
        )

        let applied = URLFilterLevelConfiguration.apply(overrides, to: .essential, in: &levels)

        XCTAssertFalse(applied, "Applying overrides for a missing level must not crash or report as applied")
        XCTAssertTrue(levels.isEmpty, "Missing level must not be inserted by the override flow")
    }

    func testOverridesDecodeUsesSnakeCaseCodingKeys() throws {
        let json = """
        {
            "essential": {
                "pir_server_url": "https://override.example",
                "pir_authentication_token": "override-token"
            },
            "safe": {}
        }
        """

        let overrides = try JSONDecoder().decode(URLFilterLevelOverrides.self, from: Data(json.utf8))

        XCTAssertEqual(overrides.essential?.pirServerURL, URL(string: "https://override.example")!)
        XCTAssertNil(overrides.essential?.pirPrivacyPassIssuerURL)
        XCTAssertEqual(overrides.essential?.pirAuthenticationToken, "override-token")
        XCTAssertNil(overrides.essential?.bloomParamsURL)
        XCTAssertNotNil(overrides.safe, "An empty level object is decoded as present with all fields nil")
        XCTAssertNil(overrides.family)
    }

    func testOverridesDecodeRejectsMalformedLevel() throws {
        let json = """
        {
            "essential": {
                "pir_server_url": 12345,
                "pir_authentication_token": "override-token"
            }
        }
        """

        let overrides = try? JSONDecoder().decode(URLFilterLevelOverrides.self, from: Data(json.utf8))

        XCTAssertNil(overrides, "Malformed level must abort the whole override decode")
    }
}
