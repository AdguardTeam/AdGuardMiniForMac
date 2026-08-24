// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewAppHostLifecycleTests.swift
//  AdguardMiniTests
//

import XCTest
import WebKit
import AppKit
import ProtoSchema

final class WKWebViewAppHostLifecycleTests: XCTestCase {
    private func makeHost() -> WKWebViewAppHost {
        let host = WKWebViewAppHost(
            module: .settings,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/settings.html"),
            onVisibilityChange: nil
        ) { _ in }
        // Tear down each host so the `didBecomeMain` observer, the window and
        // In-flight WebKit loads are cleaned up (teardown() is idempotent).
        addTeardownBlock { host.teardown() }
        return host
    }

    func testLifecycle_UnloadedToLoadingOnLoadEntry() {
        let host = makeHost()
        XCTAssertEqual(host.state, .unloaded)
        host.loadEntryIfNeeded()
        XCTAssertEqual(host.state, .loading)
    }

    func testLifecycle_LoadingToReadyOnDidFinishNavigation() {
        let host = makeHost()
        host.loadEntryIfNeeded()
        XCTAssertEqual(host.state, .loading)
        host.didFinishNavigation()
        XCTAssertEqual(host.state, .ready)
    }

    func testLifecycle_ReadyShownHiddenShownDestroyed() {
        let host = makeHost()
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        XCTAssertEqual(host.state, .ready)
        host.show()
        XCTAssertEqual(host.state, .shown)
        host.hide()
        XCTAssertEqual(host.state, .hidden)
        host.show()
        XCTAssertEqual(host.state, .shown)
        host.teardown()
        XCTAssertEqual(host.state, .destroyed)
    }

    // Load failure should move state to `.error`.
    func testLifecycle_LoadingToErrorOnProvisionalNavigationFailure() {
        let host = makeHost()
        host.loadEntryIfNeeded()
        XCTAssertEqual(host.state, .loading)
        host.didFailProvisionalNavigation(error: NSError(domain: "test", code: 42))
        XCTAssertEqual(host.state, .error)
    }

    func testLifecycle_ErrorStateAllowsRetryOnLoadEntryIfNeeded() {
        let host = makeHost()
        host.loadEntryIfNeeded()
        host.didFailProvisionalNavigation(error: NSError(domain: "test", code: 42))
        XCTAssertEqual(host.state, .error)

        // Retry from `.error`.
        host.loadEntryIfNeeded()
        XCTAssertEqual(host.state, .loading, "retry from error state re-enters loading")
    }

    /// `windowShouldClose(_:)` should hide host instead of closing.
    func testWindowShouldClose_HidesHostInsteadOfClosing() {
        let host = makeHost()
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        XCTAssertEqual(host.state, .ready)
        host.show()
        XCTAssertEqual(host.state, .shown)

        // Simulate AppKit close request.
        let shouldClose = host.windowShouldClose(host.window)

        XCTAssertFalse(shouldClose, "close is intercepted so the host hides")
        XCTAssertEqual(
            host.state,
            .hidden,
            "close-button must transition to hidden, not destroy"
        )

        // Reopen uses hidden -> shown path.
        host.show()
        XCTAssertEqual(host.state, .shown)
    }

    /// Teardown must actually release the window, not just order it out: an
    /// ordered-out window is still retained by `NSApp.windows`, so the
    /// WKWebView, its layers and its WebContent process all survive — and the
    /// Idle teardown would reclaim nothing.
    func testTeardown_ClosesTheWindowAndDetachesTheWebView() {
        let host = makeHost()
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        host.show()
        let window = host.window

        // `close()` posts `willCloseNotification` synchronously, which is the
        // Deterministic signal that teardown really closed the window rather
        // Than only ordering it out. Window deallocation is not usable here:
        // AppKit and WebKit both hold autoreleased references past the call.
        var didClose = false
        let observer = NotificationCenter.default.addObserver(
            forName: NSWindow.willCloseNotification,
            object: window,
            queue: nil
        ) { _ in
            didClose = true
        }
        defer { NotificationCenter.default.removeObserver(observer) }

        host.teardown()

        XCTAssertEqual(host.state, .destroyed)
        XCTAssertTrue(didClose, "teardown closes the window, it does not merely order it out")
        XCTAssertFalse(window.isVisible)
        XCTAssertNil(host.webView.superview, "the web view leaves the view hierarchy")
        XCTAssertNil(window.delegate, "the window delegate is detached before the close")
    }

    /// `windowShouldClose(_:)` should allow close during teardown.
    func testWindowShouldClose_PermitsCloseDuringTeardown() {
        let host = makeHost()
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        host.show()
        host.teardown()
        XCTAssertEqual(host.state, .destroyed)

        let shouldClose = host.windowShouldClose(host.window)
        XCTAssertTrue(shouldClose, "destroyed hosts allow the real close")
    }

    /// The user-rules editor's red close button / Cmd+W must defer to the TS
    /// page (`window.__closeRequested`) while the window is VISIBLE. The
    /// visible state is `.shown`, not `.ready` (`show()` transitions
    /// `.ready`/`.hidden` → `.shown`), so the page-ready check must accept
    /// `.shown` too — otherwise the window silently hides, bypassing the
    /// unsaved-changes dialog and never firing `CloseUserRulesWindow` (the
    /// settings window would stay stuck on the "editor open" plug).
    func testWindowShouldClose_UserRules_Shown_DefersToPage() {
        let host = WKWebViewAppHost(
            module: .userrules,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/userrules.html"),
            onVisibilityChange: nil
        ) { _ in }
        addTeardownBlock { host.teardown() }
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        host.show()
        XCTAssertEqual(host.state, .shown)

        let shouldClose = host.windowShouldClose(host.window)
        XCTAssertFalse(shouldClose, "user-rules editor close is deferred to the page")
        XCTAssertEqual(
            host.state,
            .shown,
            "the editor host stays alive until the CloseUserRulesWindow RPC"
        )
    }

    /// While the editor page is still loading (`.loading`), `window.__closeRequested`
    /// is not installed; the window must fall back to the native hide so the
    /// user is not trapped with an unclosable window.
    func testWindowShouldClose_UserRules_Loading_FallsBackToHide() {
        let host = WKWebViewAppHost(
            module: .userrules,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/userrules.html"),
            onVisibilityChange: nil
        ) { _ in }
        addTeardownBlock { host.teardown() }
        host.loadEntryIfNeeded()
        XCTAssertEqual(host.state, .loading)

        let shouldClose = host.windowShouldClose(host.window)
        XCTAssertFalse(shouldClose, "editor close is intercepted while loading")
        XCTAssertEqual(host.state, .hidden, "loading editor falls back to the native hide path")
    }

    /// Settings host should notify visibility on become-main while shown.
    func testWindowBecameMain_WhileShown_FiresVisibilityChange() {
        var visibleCalls: [Bool] = []
        let host = WKWebViewAppHost(
            module: .settings,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/settings.html"),
            onVisibilityChange: { visible in visibleCalls.append(visible) }
        ) { _ in }
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        host.show()
        // Ignore callback emitted by `show()`.
        visibleCalls.removeAll()

        NotificationCenter.default.post(
            name: NSWindow.didBecomeMainNotification,
            object: host.window
        )

        XCTAssertEqual(visibleCalls, [true])
    }

    /// Hidden host should not notify on become-main.
    func testWindowBecameMain_WhileHidden_DoesNotFireVisibilityChange() {
        var visibleCalls: [Bool] = []
        let host = WKWebViewAppHost(
            module: .settings,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/settings.html"),
            onVisibilityChange: { visible in visibleCalls.append(visible) }
        ) { _ in }
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        host.show()
        host.hide()
        visibleCalls.removeAll()

        NotificationCenter.default.post(
            name: NSWindow.didBecomeMainNotification,
            object: host.window
        )

        XCTAssertEqual(visibleCalls, [])
    }

    /// Non-settings modules should not notify on become-main.
    func testWindowBecameMain_NonSettingsModule_DoesNotFireVisibilityChange() {
        var visibleCalls: [Bool] = []
        let host = WKWebViewAppHost(
            module: .tray,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/tray.html"),
            onVisibilityChange: { visible in visibleCalls.append(visible) }
        ) { _ in }
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        host.show()
        host.hide()
        visibleCalls.removeAll()

        NotificationCenter.default.post(
            name: NSWindow.didBecomeMainNotification,
            object: host.window
        )

        XCTAssertEqual(visibleCalls, [])
    }
}
