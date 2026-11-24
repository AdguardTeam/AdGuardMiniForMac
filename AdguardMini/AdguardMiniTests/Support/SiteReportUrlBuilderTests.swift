// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SiteReportUrlBuilderTests.swift
//  AdguardMiniTests
//

import XCTest

import AppBackend

/// Covers the query parameters of the site report URL built for the reports web API.
final class SiteReportUrlBuilderTests: XCTestCase {
    /// The enabled language-specific adblocking state is sent as `1`.
    func testLanguageSpecificAdblockingEnabledSendsOne() throws {
        let items = try self.makeQueryItems(languageSpecificAdblocking: true)

        XCTAssertEqual(self.queryValue(named: "adblocking.language_specific_enabled", in: items), "1")
    }

    /// The disabled language-specific adblocking state is sent as `0`, not omitted.
    func testLanguageSpecificAdblockingDisabledSendsZero() throws {
        let items = try self.makeQueryItems(languageSpecificAdblocking: false)

        XCTAssertEqual(self.queryValue(named: "adblocking.language_specific_enabled", in: items), "0")
    }

    /// The report scheme version is sent in both adblocking states.
    func testSchemeVersionFourIsAlwaysSent() throws {
        let enabledItems = try self.makeQueryItems(languageSpecificAdblocking: true)
        let disabledItems = try self.makeQueryItems(languageSpecificAdblocking: false)

        XCTAssertEqual(self.queryValue(named: "scheme_version", in: enabledItems), "4")
        XCTAssertEqual(self.queryValue(named: "scheme_version", in: disabledItems), "4")
    }

    /// Booleans are encoded as `1`/`0`, never as `true`/`false`.
    func testBooleansAreNeverSentAsTrueOrFalse() throws {
        let enabledItems = try self.makeQueryItems(languageSpecificAdblocking: true)
        let disabledItems = try self.makeQueryItems(languageSpecificAdblocking: false)

        let booleanNames = [
            "extensions.enabled",
            "mmini.advanced_rules",
            "adblocking.language_specific_enabled"
        ]
        for items in [enabledItems, disabledItems] {
            for name in booleanNames {
                let value = self.queryValue(named: name, in: items)
                XCTAssertTrue(value == "1" || value == "0", "Unexpected \(name) value: \(value ?? "nil")")
            }
        }
    }

    /// The v4 parameter names replace their v3 counterparts.
    func testRenamedParametersReplaceTheV3Names() throws {
        let items = try self.makeQueryItems(languageSpecificAdblocking: true)
        let names = items.map(\.name)

        XCTAssertEqual(self.queryValue(named: "regular_filters", in: items), "2,3")
        XCTAssertEqual(
            self.queryValue(named: "extensions.value", in: items),
            "Test extension (script; url: https://example.com/script.js)"
        )
        XCTAssertTrue(names.contains("mmini.advanced_rules"))
        XCTAssertFalse(names.contains("filters"))
        XCTAssertFalse(names.contains("advanced_rules"))
    }

    /// The ad blocking state parameter is not sent at all.
    func testAdblockingEnabledIsNotSent() throws {
        let items = try self.makeQueryItems(languageSpecificAdblocking: true)

        XCTAssertNil(self.queryValue(named: "adblocking.enabled", in: items))
    }

    /// The TDS parameters carry the screen name and the application identifier.
    func testTdsParametersCarryScreenAndAppId() throws {
        let url = try self.makeUrl(languageSpecificAdblocking: true)
        let items = try self.queryItems(of: url)

        XCTAssertEqual(self.queryValue(named: "from", in: items), "test_screen")
        XCTAssertEqual(self.queryValue(named: "appid", in: items), "test-app-id")
    }

    /// The paid flag decides the license type sent with the report.
    func testFreeLicenseSendsFreeLicenseType() throws {
        let freeItems = try self.makeQueryItems(languageSpecificAdblocking: true, isPaid: false)
        let paidItems = try self.makeQueryItems(languageSpecificAdblocking: true)

        XCTAssertEqual(self.queryValue(named: "license_type", in: freeItems), "free")
        XCTAssertEqual(self.queryValue(named: "license_type", in: paidItems), "paid")
    }

    /// A disabled extensions switch omits the extension list but still sends its own flag.
    func testExtensionsDisabledOmitsExtensionsValue() throws {
        let items = try self.makeQueryItems(Fixture(extensionsEnabled: false, advancedRules: true))

        XCTAssertNil(self.queryValue(named: "extensions.value", in: items))
        XCTAssertEqual(self.queryValue(named: "extensions.enabled", in: items), "0")
        XCTAssertEqual(self.queryValue(named: "mmini.advanced_rules", in: items), "1")
    }

    /// The advanced rules switch is sent as `0` while the extensions stay in the report.
    func testAdvancedRulesDisabledSendsZero() throws {
        let items = try self.makeQueryItems(Fixture(extensionsEnabled: true, advancedRules: false))

        XCTAssertEqual(self.queryValue(named: "mmini.advanced_rules", in: items), "0")
        XCTAssertNotNil(self.queryValue(named: "extensions.value", in: items))
    }

    /// A custom filter is sent as its name followed by its URL.
    func testCustomFiltersCarryNameAndUrl() throws {
        let filter = SiteReport.CustomFilter(name: "Test filter", url: "https://example.com/filter.txt")
        let items = try self.makeQueryItems(Fixture(customFilters: [filter]))

        XCTAssertEqual(
            self.queryValue(named: "custom_filters", in: items),
            "Test filter (url: https://example.com/filter.txt)"
        )
    }

    /// The last filters update is sent as an ISO 8601 UTC timestamp.
    func testLastFiltersUpdateUsesISO8601() throws {
        let items = try self.makeQueryItems(Fixture())

        XCTAssertEqual(self.queryValue(named: "filters_last_update", in: items), "2024-01-01T00:00:00Z")
    }

    /// A report without a page URL carries no URL parameter.
    func testMissingPageUrlOmitsUrlParameter() throws {
        let withoutPageUrl = try self.makeQueryItems(Fixture(pageUrl: nil))
        let withPageUrl = try self.makeQueryItems(Fixture(pageUrl: "https://example.com/page"))

        XCTAssertNil(self.queryValue(named: "url", in: withoutPageUrl))
        XCTAssertEqual(self.queryValue(named: "url", in: withPageUrl), "https://example.com/page")
    }

    /// A comma in a custom filter name is replaced so the list keeps one entry.
    func testCustomFilterNameWithCommaKeepsOneEntry() throws {
        let filter = SiteReport.CustomFilter(name: "Test, filter", url: "https://example.com/filter.txt")
        let items = try self.makeQueryItems(Fixture(customFilters: [filter]))
        let value = try XCTUnwrap(self.queryValue(named: "custom_filters", in: items))

        XCTAssertEqual(value, "Test| filter (url: https://example.com/filter.txt)")
        XCTAssertEqual(value.components(separatedBy: ",").count, 1)
    }

    // MARK: - Fixtures

    /// Fixed values used to build a report state.
    private struct Fixture {
        var screen = "test_screen"
        var pageUrl: String? = "https://example.com/page"
        var isPaid = true
        var enabledFilterIds = [2, 3]
        var customFilters = [
            SiteReport.CustomFilter(name: "Test filter", url: "https://example.com/filter.txt")
        ]
        var extensions = [
            SiteReport.Extension(name: "Test extension", type: .script, url: "https://example.com/script.js")
        ]
        var extensionsEnabled = true
        var advancedRules = true
        var lastFiltersUpdate = Date(timeIntervalSince1970: 1_704_067_200)
        var languageSpecificAdblocking = true
    }

    /// Creates a backend with fixed values for the report URL tests.
    private func makeBackend() -> AppBackend.Backend {
        Backend(
            configuration: Backend.Configuration(
                responseValidationKey: "test-validation-key",
                userAgent: "test-user-agent",
                app: Backend.App.macMini(
                    id: "test-app-id",
                    type: .standalone,
                    appVersion: "1.0.0",
                    versionTitle: "1.0.0"
                ),
                baseURLs: .production
            )
        )
    }

    /// Creates a fully filled report state from the given fixture.
    private func makeState(_ fixture: Fixture) -> SiteReportState {
        SiteReportState(
            screen: fixture.screen,
            pageUrl: fixture.pageUrl,
            isPaid: fixture.isPaid,
            enabledFilterIds: fixture.enabledFilterIds,
            customFilters: fixture.customFilters,
            extensions: fixture.extensions,
            extensionsEnabled: fixture.extensionsEnabled,
            advancedRules: fixture.advancedRules,
            lastFiltersUpdate: fixture.lastFiltersUpdate,
            languageSpecificAdblocking: fixture.languageSpecificAdblocking
        )
    }

    /// Creates a fully filled report state with the given adblocking and paid flags.
    private func makeState(languageSpecificAdblocking: Bool, isPaid: Bool = true) -> SiteReportState {
        self.makeState(
            Fixture(isPaid: isPaid, languageSpecificAdblocking: languageSpecificAdblocking)
        )
    }

    /// Builds the report URL for the given fixture.
    private func makeUrl(_ fixture: Fixture) throws -> URL {
        let url = SiteReportUrlBuilder.makeUrl(
            backend: self.makeBackend(),
            state: self.makeState(fixture)
        )
        return try XCTUnwrap(url)
    }

    /// Builds the report URL for the given adblocking and paid flags.
    private func makeUrl(languageSpecificAdblocking: Bool, isPaid: Bool = true) throws -> URL {
        try self.makeUrl(Fixture(isPaid: isPaid, languageSpecificAdblocking: languageSpecificAdblocking))
    }

    /// Returns the query items of the report URL for the given fixture.
    private func makeQueryItems(_ fixture: Fixture) throws -> [URLQueryItem] {
        let url = try self.makeUrl(fixture)
        return try self.queryItems(of: url)
    }

    /// Returns the query items of the report URL for the given adblocking and paid flags.
    private func makeQueryItems(languageSpecificAdblocking: Bool, isPaid: Bool = true) throws -> [URLQueryItem] {
        try self.makeQueryItems(Fixture(isPaid: isPaid, languageSpecificAdblocking: languageSpecificAdblocking))
    }

    /// Returns the query items of the given URL.
    private func queryItems(of url: URL) throws -> [URLQueryItem] {
        let components = try XCTUnwrap(URLComponents(url: url, resolvingAgainstBaseURL: false))
        return try XCTUnwrap(components.queryItems)
    }

    /// Returns the value of the first query item with the given name.
    private func queryValue(named name: String, in items: [URLQueryItem]) -> String? {
        items.first { $0.name == name }?.value
    }
}
