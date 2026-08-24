// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  InterfaceRequestDenierTests.swift
//  AdguardMiniTests
//

import XCTest
import WebKit

/// Capturing logger seam for refusal assertions.
private final class RecordingDenialLog: InterfaceRequestDenialLogging {
    private(set) var refusals: [String] = []
    func recordRefusal(_ entry: String) { refusals.append(entry) }
}

final class InterfaceRequestDenierTests: XCTestCase {
    private func makeDenier() -> (denier: InterfaceRequestDenier, log: RecordingDenialLog) {
        let log = RecordingDenialLog()
        let denier = InterfaceRequestDenier(logger: log)
        return (denier, log)
    }

    /// `refuseWindowCreation` should return `nil` and log requested URL.
    func testCreateWebView_ReturnsNilAndLogsRefusalOnce() {
        let (denier, log) = makeDenier()
        let result = denier.refuseWindowCreation(requestedURL: "https://example.com")
        XCTAssertNil(result, "no window must be created")
        XCTAssertEqual(log.refusals.count, 1, "exactly one log record")
        XCTAssertTrue(log.refusals[0].contains("https://example.com"), "must log the requested URL")
    }

    /// Alert refusal should complete immediately and log once.
    func testAlertPanel_CompletesImmediatelyAndLogsOnce() {
        let (denier, log) = makeDenier()
        var didComplete = false
        denier.refuseAlert(message: "boom") { didComplete = true }
        XCTAssertTrue(didComplete, "completion must fire so the page cannot wedge")
        XCTAssertEqual(log.refusals.count, 1)
        XCTAssertTrue(log.refusals[0].contains("boom"))
    }

    /// Confirm refusal should return `false` and log once.
    func testConfirmPanel_ReturnsFalseAndLogsOnce() {
        let (denier, log) = makeDenier()
        var result = false
        denier.refuseConfirm(message: "are you sure") { result = $0 }
        XCTAssertFalse(result, "confirm must dismiss as false")
        XCTAssertEqual(log.refusals.count, 1)
    }

    /// Prompt refusal should return `nil` and log once.
    func testTextInputPanel_ReturnsNilAndLogsOnce() {
        let (denier, log) = makeDenier()
        var result: String?
        denier.refusePrompt(prompt: "name") { result = $0 }
        XCTAssertNil(result, "prompt must dismiss as nil")
        XCTAssertEqual(log.refusals.count, 1)
    }

    /// Open-panel refusal should return `nil` and log once.
    func testOpenPanel_ReturnsNilAndLogsOnce() {
        let (denier, log) = makeDenier()
        var result: [URL] = []
        denier.refuseOpenPanel { result = $0 ?? [] }
        XCTAssertEqual(result, [], "file picker must be refused with no files")
        XCTAssertEqual(log.refusals.count, 1)
    }

    /// AC: media-capture requests are denied (never `.grant`/`.prompt`), with
    /// exactly one log record.
    func testMediaCapture_ReturnsDenyAndLogsOnce() {
        let (denier, log) = makeDenier()
        var decision: WKPermissionDecision = .prompt
        denier.refuseMediaCapture { decision = $0 }
        XCTAssertEqual(decision, .deny, "media capture must be denied outright")
        XCTAssertEqual(log.refusals.count, 1)
        XCTAssertTrue(log.refusals[0].contains("media capture"), "must log the refusal")
    }
}
