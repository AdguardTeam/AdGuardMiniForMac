// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  NavigationPolicyTests.swift
//  AdguardMiniTests
//

import XCTest
import WebKit

private final class MockLinkOpener: LinkOpening {
    private(set) var opened: [URL] = []
    func openURL(_ url: URL) { opened.append(url) }
}

final class NavigationPolicyTests: XCTestCase {
    private let entryURL = URL(fileURLWithPath: "/tmp/WebUI/settings.html")

    private func makePolicy() -> (policy: NavigationPolicy, opener: MockLinkOpener) {
        let opener = MockLinkOpener()
        let gate = ExternalLinkGate(linkOpener: opener)
        let policy = NavigationPolicy(entryURL: entryURL, externalLinkGate: gate)
        return (policy, opener)
    }

    /// Entry-page navigation should be allowed.
    func testEntryDestination_AllowedAndNotHandedToGate() {
        let (policy, opener) = makePolicy()
        XCTAssertEqual(policy.decidePolicy(forNavigationTo: entryURL), .allow)
        XCTAssertTrue(opener.opened.isEmpty, "entry navigation must not hand off")
    }

    /// Retrying entry URL should still be allowed after a cancellation.
    func testRetryToEntry_AfterCancelledNavigation_StillAllowed() {
        let (policy, _) = makePolicy()
        XCTAssertEqual(
            policy.decidePolicy(forNavigationTo: URL(string: "https://example.com")!),
            .cancel
        )
        XCTAssertEqual(
            policy.decidePolicy(forNavigationTo: entryURL),
            .allow,
            "retry to entry must be allowed regardless of prior cancellations"
        )
    }

    /// Cancelled web destinations should be handed to external gate.
    func testCancelledWebDestinations_HandedToGate() {
        let cases: [URL] = [
            URL(string: "http://example.com")!,
            URL(string: "https://adguard.com")!,
            URL(string: "HTTPS://CASE.IGNORED")!
        ]
        for url in cases {
            let (policy, opener) = makePolicy()
            XCTAssertEqual(policy.decidePolicy(forNavigationTo: url), .cancel)
            XCTAssertEqual(
                opener.opened,
                [url],
                "\(url.absoluteString) should be handed to the gate"
            )
        }
    }

    /// Cancelled non-web destinations should not be handed to gate.
    func testCancelledNonWebDestinations_NotHandedAnywhere() {
        let cases: [URL?] = [
            URL(string: "file:///etc/passwd"),
            URL(string: "file:///tmp/WebUI/style.css"),
            URL(string: "file:///tmp/WebUI/../secret"),
            URL(string: "file:///tmp/WebUI/%2e%2e/secret"),
            URL(string: "mailto:feedback@adguard.com"),
            URL(string: "prefs:com.apple.preference.notifications"),
            URL(string: "smb://server/share"),
            URL(string: "javascript:alert(1)"),
            URL(string: "data:text/html,%3Cb%3Ex%3C/b%3E")
        ]
        for url in cases {
            let (policy, opener) = makePolicy()
            XCTAssertEqual(
                policy.decidePolicy(forNavigationTo: url),
                .cancel,
                "\(String(describing: url)) must be cancelled"
            )
            XCTAssertTrue(
                opener.opened.isEmpty,
                "\(String(describing: url)) must not be handed to the gate"
            )
        }
    }

    /// Nil destination should be cancelled without gate handoff.
    func testNilDestination_CancelledWithoutCrashing() {
        let (policy, opener) = makePolicy()
        XCTAssertEqual(policy.decidePolicy(forNavigationTo: nil), .cancel)
        XCTAssertTrue(opener.opened.isEmpty)
    }
}
