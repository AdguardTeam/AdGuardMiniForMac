// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStateDiagnosticsTests.swift
//  AdguardMiniTests
//

import XCTest

final class URLFilterStateDiagnosticsTests: XCTestCase {
    func testWebProtectionSectionIncludesAllFields() {
        let state = URLFilterState(
            enabled: true,
            status: .running,
            serverURL: URL(string: "https://pirgateway.service.agrd.dev"),
            issuerURL: nil,
            lastDisconnectError: nil
        )
        let section = state.webProtectionSection(
            protectionLevel: .safe,
            rulesCount: 12_345,
            lastUpdate: Date(timeIntervalSince1970: 1_600_000_000)
        )

        XCTAssertTrue(section.contains("System Wide Protection:"))
        XCTAssertTrue(section.contains("Enabled: Yes"))
        XCTAssertTrue(section.contains("Protection level: safe"))
        XCTAssertTrue(section.contains("Status: running"))
        XCTAssertTrue(section.contains("Rules count: 12345"))
        // 2020-09-13 12:26:40 GMT
        XCTAssertTrue(section.contains("Last update: 2020-09-13 12:26:40"))
        XCTAssertTrue(section.contains("Last disconnect error: None"))
    }

    func testWebProtectionSectionHandlesEmptyAndErrorValues() {
        let state = URLFilterState(
            enabled: false,
            status: .invalid,
            serverURL: nil,
            issuerURL: nil,
            lastDisconnectError: .configurationInvalid
        )
        let section = state.webProtectionSection(
            protectionLevel: .essential,
            rulesCount: nil,
            lastUpdate: nil
        )

        XCTAssertTrue(section.contains("Enabled: No"))
        XCTAssertTrue(section.contains("Protection level: essential"))
        XCTAssertTrue(section.contains("Status: invalid"))
        XCTAssertTrue(section.contains("Rules count: Unknown"))
        XCTAssertTrue(section.contains("Last update: Unknown"))
        XCTAssertTrue(section.contains("Last disconnect error: configurationInvalid"))
    }
}
