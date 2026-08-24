// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ExternalLinkGateTests.swift
//  AdguardMiniTests
//

import XCTest

private final class MockLinkOpener: LinkOpening {
    private(set) var opened: [URL] = []
    func openURL(_ url: URL) { opened.append(url) }
}

final class ExternalLinkGateTests: XCTestCase {
    private func makeGate() -> (gate: ExternalLinkGate, opener: MockLinkOpener) {
        let opener = MockLinkOpener()
        let gate = ExternalLinkGate(linkOpener: opener)
        return (gate, opener)
    }

    func testPermittedSchemes_OpenExactURLViaLinkOpener() {
        let cases: [(input: String, expectedURL: URL)] = [
            ("https://adguard.com", URL(string: "https://adguard.com")!),
            ("http://example.com", URL(string: "http://example.com")!),
            ("mailto:feedback@adguard.com", URL(string: "mailto:feedback@adguard.com")!),
            ("HTTPS://EXAMPLE.COM", URL(string: "HTTPS://EXAMPLE.COM")!),
            ("HtTp://MiXedCase.Net", URL(string: "HtTp://MiXedCase.Net")!)
        ]
        for entry in cases {
            let (gate, opener) = makeGate()
            gate.open(candidate: entry.input)
            XCTAssertEqual(
                opener.opened,
                [entry.expectedURL],
                "'\(entry.input)' should open"
            )
        }
    }

    func testHostileInputs_AreRejectedWithoutOpeningOrCrashing() {
        // Coverage includes file/prefs/script/custom schemes and invalid payloads.
        let cases: [Any?] = [
            "file:///etc/passwd",
            "prefs:com.apple.preference.notifications",
            "smb://server/share",
            "javascript:alert(1)",
            "data:text/html,<b>x</b>",
            "myapp://open/page",
            "example.com/scheme-less/path",
            "//protocol-relativehost/path",
            "",
            "   ",
            42,
            ["a", "b"],
            nil
        ]
        for candidate in cases {
            let (gate, opener) = makeGate()
            gate.open(candidate: candidate)
            XCTAssertTrue(
                opener.opened.isEmpty,
                "'\(String(describing: candidate))' must not open"
            )
        }
    }
}
