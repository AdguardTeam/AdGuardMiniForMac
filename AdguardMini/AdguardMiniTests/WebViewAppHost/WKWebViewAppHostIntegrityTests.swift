// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewAppHostIntegrityTests.swift
//  AdguardMiniTests
//

import XCTest

/// Verifier stub with a fixed verdict. `verdict` is mutable so a test can
/// simulate a bundle modified while the app runs.
private final class StubIntegrityVerifier: WebUIIntegrityVerifying {
    var verdict: Bool

    init(verdict: Bool) {
        self.verdict = verdict
    }

    func verifyWebUIBundle() -> Bool {
        self.verdict
    }
}

/// Recording test double for `WKWebViewFailurePresenting`.
private final class IntegrityRecordingFailurePresenter: WKWebViewFailurePresenting {
    var bundleIntegrityFailureCalls = 0
    /// Optional hook so tests can synchronize on the async presenter routing.
    var onIntegrityFailure: (() -> Void)?

    func handleLoadFailure(module: String, error: Error) async {}
    func handleJSRuntimeError(message: String, stack: String?) async {}
    func handleCSPViolation(message: String, stack: String?) async {}
    func handleRpcError(message: String, stack: String?) async {}
    func handleRecurringRpcTimeout() async {}

    func handleBundleIntegrityFailure() async {
        self.bundleIntegrityFailureCalls += 1
        self.onIntegrityFailure?()
    }
}

final class WKWebViewAppHostIntegrityTests: XCTestCase {
    @MainActor
    private func makeHost(
        verifier: any WebUIIntegrityVerifying,
        presenter: IntegrityRecordingFailurePresenter = IntegrityRecordingFailurePresenter(),
        entryURL: URL = URL(fileURLWithPath: "/tmp/WebUI/settings.html")
    ) -> WKWebViewAppHost {
        let host = WKWebViewAppHost(
            module: .settings,
            entryURL: entryURL,
            onVisibilityChange: nil,
            failurePresenter: presenter,
            integrityVerifier: verifier,
            // Labeled parameter `bridgeSetup` describes the closure's role explicitly.
            // swiftlint:disable:next trailing_closure
            bridgeSetup: { _ in }
        )
        // Tear down each host so its real `WKWebView` and WebContent process
        // Released before the next test: leaked hosts accumulate on parallel
        // CI shards and stall the main executor past the fulfillment timeout.
        addTeardownBlock { host.teardown() }
        return host
    }

    @MainActor
    func testRefusedBundle_HostDoesNotLoad_NotifiesPresenter() async {
        let presenter = IntegrityRecordingFailurePresenter()
        let exp = expectation(description: "integrity failure routed to presenter")
        presenter.onIntegrityFailure = { exp.fulfill() }

        let host = makeHost(verifier: StubIntegrityVerifier(verdict: false), presenter: presenter)
        host.loadEntryIfNeeded()

        await fulfillment(of: [exp], timeout: 10)
        XCTAssertEqual(presenter.bundleIntegrityFailureCalls, 1)
        XCTAssertEqual(
            host.state,
            .unloaded,
            "a refused bundle must never start loading"
        )
        XCTAssertEqual(
            host.lastLoadFileURLAllowingReadAccessTo,
            URL(fileURLWithPath: "/"),
            "no file may be loaded for a refused bundle"
        )
    }

    @MainActor
    func testRefusedBundle_ShowDoesNotOrderWindowFront() {
        let host = makeHost(verifier: StubIntegrityVerifier(verdict: false))
        host.show()
        XCTAssertFalse(
            host.window.isVisible,
            "a refused bundle must not present a window"
        )
        XCTAssertEqual(host.state, .unloaded)
    }

    @MainActor
    func testAcceptedBundle_HostLoadsNormally() {
        let entry = URL(fileURLWithPath: "/tmp/WebUI/settings.html")
        let host = makeHost(verifier: StubIntegrityVerifier(verdict: true), entryURL: entry)
        host.loadEntryIfNeeded()
        XCTAssertEqual(host.state, .loading)
        XCTAssertEqual(
            host.lastLoadFileURLAllowingReadAccessTo,
            entry.deletingLastPathComponent()
        )
    }

    @MainActor
    func testRetryLoad_ReChecksIntegrity_DetectsTampering() async {
        // A host created while the bundle was intact, then the bundle is
        // Modified before the next load attempt: the load-time re-check must
        // Refuse to load.
        let verifier = StubIntegrityVerifier(verdict: true)
        let presenter = IntegrityRecordingFailurePresenter()
        let exp = expectation(description: "integrity failure routed to presenter")
        presenter.onIntegrityFailure = { exp.fulfill() }

        let host = makeHost(verifier: verifier, presenter: presenter)
        host.loadEntryIfNeeded()
        XCTAssertEqual(host.state, .loading)

        // Simulate a failed navigation (host is retryable from `.error`).
        host.didFailProvisionalNavigation(error: NSError(domain: "test", code: 7))
        XCTAssertEqual(host.state, .error)

        // The bundle is modified while the app runs.
        verifier.verdict = false
        host.loadEntryIfNeeded()

        await fulfillment(of: [exp], timeout: 10)
        XCTAssertEqual(host.state, .error, "a refused retry must not start loading")
        XCTAssertEqual(presenter.bundleIntegrityFailureCalls, 1)
    }
}
