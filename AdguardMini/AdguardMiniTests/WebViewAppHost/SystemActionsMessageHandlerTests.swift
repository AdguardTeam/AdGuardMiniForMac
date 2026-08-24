// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SystemActionsMessageHandlerTests.swift
//  AdguardMiniTests
//

import XCTest
import WebKit
import ProtoSchema

private final class MockLinkOpener: LinkOpening {
    var opened: [URL] = []
    func openURL(_ url: URL) { opened.append(url) }
}

private final class MockPasteboard: PasteboardWriting {
    var written: [String] = []
    func writeString(_ string: String) { written.append(string) }
}

/// Fixture for handler and mock dependencies.
private struct HandlerFixture {
    let handler: SystemActionsMessageHandler
    let linkOpener: MockLinkOpener
    let pasteboard: MockPasteboard
}

final class SystemActionsMessageHandlerTests: XCTestCase {
    private func makeHandler() -> HandlerFixture {
        let link = MockLinkOpener()
        let clipboard = MockPasteboard()
        let gate = ExternalLinkGate(linkOpener: link)
        let handler = SystemActionsMessageHandler(externalLinkGate: gate, pasteboard: clipboard)
        return HandlerFixture(handler: handler, linkOpener: link, pasteboard: clipboard)
    }

    func testOpenLinkInBrowser_RoutesURLToLinkOpener() {
        let fixture = makeHandler()
        let msg = StubScriptMessage(name: "openLinkInBrowser", body: "https://adguard.com")
        fixture.handler.handle(message: msg)
        XCTAssertEqual(fixture.linkOpener.opened, [URL(string: "https://adguard.com")!])
    }

    func testOpenLinkInBrowser_HttpScheme_IsAllowed() {
        let fixture = makeHandler()
        let msg = StubScriptMessage(name: "openLinkInBrowser", body: "http://example.com")
        fixture.handler.handle(message: msg)
        XCTAssertEqual(fixture.linkOpener.opened, [URL(string: "http://example.com")!])
    }

    func testOpenLinkInBrowser_FileScheme_IsRejected() {
        let fixture = makeHandler()
        let msg = StubScriptMessage(name: "openLinkInBrowser", body: "file:///etc/passwd")
        fixture.handler.handle(message: msg)
        XCTAssertTrue(
            fixture.linkOpener.opened.isEmpty,
            "file:// scheme must be rejected to prevent access to local file paths"
        )
    }

    func testOpenLinkInBrowser_JavascriptScheme_IsRejected() {
        let fixture = makeHandler()
        let msg = StubScriptMessage(name: "openLinkInBrowser", body: "javascript:alert(1)")
        fixture.handler.handle(message: msg)
        XCTAssertTrue(
            fixture.linkOpener.opened.isEmpty,
            "javascript: scheme must be rejected"
        )
    }

    func testOpenLinkInBrowser_CustomScheme_IsRejected() {
        let fixture = makeHandler()
        let msg = StubScriptMessage(name: "openLinkInBrowser", body: "ssh://attacker.example.com")
        fixture.handler.handle(message: msg)
        XCTAssertTrue(
            fixture.linkOpener.opened.isEmpty,
            "Custom/OS-level URL schemes must be rejected"
        )
    }

    func testSystemClipboard_RoutesStringToPasteboard() {
        let fixture = makeHandler()
        let msg = StubScriptMessage(name: "systemClipboard", body: "LICENSE-KEY-1234")
        fixture.handler.handle(message: msg)
        XCTAssertEqual(fixture.pasteboard.written, ["LICENSE-KEY-1234"])
    }

    func testUnknownNameOrBadBody_IsDroppedWithoutCrash() {
        let fixture = makeHandler()
        fixture.handler.handle(message: StubScriptMessage(name: "other", body: "x"))
        fixture.handler.handle(message: StubScriptMessage(name: "openLinkInBrowser", body: 42))
        // No side effects either — an unknown name or bad body must not fall
        // Through to the gate / pasteboard.
        XCTAssertTrue(fixture.linkOpener.opened.isEmpty, "unknown name must not open a link")
        XCTAssertTrue(fixture.pasteboard.written.isEmpty, "bad body must not write the clipboard")
    }
    func testOpenLinkInBrowser_HostileSchemeRejectedThroughGate() {
        let fixture = makeHandler()
        let msg = StubScriptMessage(name: "openLinkInBrowser", body: "file:///etc/passwd")
        fixture.handler.handle(message: msg)
        XCTAssertTrue(fixture.linkOpener.opened.isEmpty)
    }

    func testSystemClipboard_OversizedPayload_IsRejected() {
        let fixture = makeHandler()
        // Mirrors the production `maxClipboardPayloadBytes = 1_048_576` cap.
        let maxClipboardPayloadBytes = 1_048_576
        let huge = String(repeating: "a", count: maxClipboardPayloadBytes + 1)
        fixture.handler.handle(message: StubScriptMessage(name: "systemClipboard", body: huge))
        XCTAssertTrue(fixture.pasteboard.written.isEmpty)
    }

    func testSystemClipboard_ExactlyAtLimit_IsAccepted() {
        let fixture = makeHandler()
        let maxClipboardPayloadBytes = 1_048_576
        let payload = String(repeating: "a", count: maxClipboardPayloadBytes)
        fixture.handler.handle(message: StubScriptMessage(name: "systemClipboard", body: payload))
        XCTAssertEqual(fixture.pasteboard.written, [payload])
    }

    func testSystemClipboard_RateLimit_DropsWritesAfterBurst_ThenRecovers() {
        var current = Date(timeIntervalSince1970: 0)
        let limiter = TokenBucketLimiter(capacity: 2, refillPerSecond: 2) { current.timeIntervalSince1970 }
        let link = MockLinkOpener()
        let clipboard = MockPasteboard()
        let gate = ExternalLinkGate(linkOpener: link)
        let handler = SystemActionsMessageHandler(
            externalLinkGate: gate,
            pasteboard: clipboard,
            clipboardLimiter: limiter
        )
        let msg = StubScriptMessage(name: "systemClipboard", body: "copy-1")

        handler.handle(message: msg)  // allowed
        handler.handle(message: msg)  // allowed
        handler.handle(message: msg)  // dropped
        XCTAssertEqual(clipboard.written.count, 2)

        current = current.addingTimeInterval(1)  // refilled
        handler.handle(message: msg)  // allowed
        XCTAssertEqual(clipboard.written.count, 3)
    }
}

private struct StubScriptMessage: ScriptMessageHandling {
    let name: String
    let body: Any
}
