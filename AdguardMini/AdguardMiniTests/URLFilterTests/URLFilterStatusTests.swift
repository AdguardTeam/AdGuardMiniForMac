// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStatusTests.swift
//  AdguardMiniTests
//

import XCTest

final class URLFilterStatusTests: XCTestCase {
    func testInvalidWithValidConfigAndDisabledMapsToDisabled() {
        let result = URLFilterStatus.derive(
            rawStatus: .invalid,
            isEnabled: false,
            hasValidConfiguration: true,
            errorMessage: nil
        )
        XCTAssertEqual(result, .disabled)
    }

    func testInvalidWithoutValidConfigMapsToInvalid() {
        let result = URLFilterStatus.derive(
            rawStatus: .invalid,
            isEnabled: false,
            hasValidConfiguration: false,
            errorMessage: nil
        )
        XCTAssertEqual(result, .invalid)
    }

    func testInvalidWhileEnabledMapsToInvalid() {
        let result = URLFilterStatus.derive(
            rawStatus: .invalid,
            isEnabled: true,
            hasValidConfiguration: true,
            errorMessage: nil
        )
        XCTAssertEqual(result, .invalid)
    }

    func testStartingAndRunningMapDirectly() {
        XCTAssertEqual(
            URLFilterStatus.derive(
                rawStatus: .starting,
                isEnabled: true,
                hasValidConfiguration: true,
                errorMessage: nil
            ),
            .starting
        )
        XCTAssertEqual(
            URLFilterStatus.derive(
                rawStatus: .running,
                isEnabled: true,
                hasValidConfiguration: true,
                errorMessage: nil
            ),
            .running
        )
    }

    func testStoppedStoppingUnknownCarryErrorMessage() {
        XCTAssertEqual(
            URLFilterStatus.derive(
                rawStatus: .stopped,
                isEnabled: false,
                hasValidConfiguration: true,
                errorMessage: "connection interrupted"
            ),
            .stopped(errorMessage: "connection interrupted")
        )
        XCTAssertEqual(
            URLFilterStatus.derive(
                rawStatus: .stopping,
                isEnabled: true,
                hasValidConfiguration: true,
                errorMessage: "provider not found"
            ),
            .stopping(errorMessage: "provider not found")
        )
        XCTAssertEqual(
            URLFilterStatus.derive(
                rawStatus: .unknown,
                isEnabled: true,
                hasValidConfiguration: true,
                errorMessage: "unexpected state"
            ),
            .unknown(errorMessage: "unexpected state")
        )
    }
}
