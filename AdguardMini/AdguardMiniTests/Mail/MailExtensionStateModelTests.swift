// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailExtensionStateModelTests.swift
//  AdguardMiniTests
//

import XCTest

/// Tests the pure model types (no UserDefaults/actor involved).
final class MailExtensionStateModelTests: XCTestCase {
    // `AC3`: `MailExtension.Status` exposes exactly the six expected cases and
    // Omits `disabled` (MailKit exposes no extension-enabled query).
    func testStatus_hasExactlySixExpectedCases_noDisabled() {
        XCTAssertEqual(MailExtension.Status.allCases.count, 6)
        XCTAssertEqual(
            MailExtension.Status.allCases,
            [.unknown, .ok, .loading, .limitExceeded, .converterError, .writeError]
        )
    }

    // AC1 / AC4: `.empty` defaults to `.unknown` with empty metrics.
    func testState_empty_defaultsToUnknown() {
        let empty = MailExtension.State.empty
        XCTAssertEqual(empty.status, .unknown)
        XCTAssertEqual(empty.rulesInfo, .empty)
        XCTAssertNil(empty.error)
    }

    // AC2 / AC4: `State` round-trips through Codable with all fields preserved.
    func testState_codableRoundTrip_preservesAllFields() throws {
        let original = MailExtension.State(
            rulesInfo: MailConversionInfo(
                sourceRulesCount: 250,
                jsonEntriesCount: 200,
                discardedRules: 50,
                errorsCount: 3
            ),
            status: .converterError,
            error: .writeError("disk full")
        )

        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(MailExtension.State.self, from: data)

        XCTAssertEqual(decoded, original)
    }

    // AC4: `ExtensionError` round-trips through Codable, including its message.
    func testExtensionError_codableRoundTrip_writeErrorMessage() throws {
        let original: MailExtension.State.ExtensionError = .writeError("disk full")

        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(
            MailExtension.State.ExtensionError.self,
            from: data
        )

        XCTAssertEqual(decoded, original)
        XCTAssertEqual(decoded.message, "disk full")
    }

    func testConversionInfo_overLimit_reflectsDiscardedRules() {
        XCTAssertFalse(MailConversionInfo.empty.overLimit)
        XCTAssertFalse(MailConversionInfo.invalid.overLimit)

        XCTAssertTrue(
            MailConversionInfo(
                sourceRulesCount: 100,
                jsonEntriesCount: 80,
                discardedRules: 20,
                errorsCount: 0
            ).overLimit
        )
    }
}
