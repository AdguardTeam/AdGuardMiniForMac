// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ChildWindowLifecycleTests.swift
//  AdguardMiniTests
//

import AppKit
import XCTest

/// Lifecycle tests for `openChildWindow` and `closeChildWindow`.
/// Uses real `WKWebViewAppHost` instances through factory injection.
final class ChildWindowLifecycleTests: XCTestCase {
    // MARK: - Lazy creation

    func testOpenChildWindow_CreatesChildHostWhenParentIsShown() throws {
        let scenario = ChildWindowScenario.given(parentShown: true)
        let id = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        XCTAssertEqual(id, "0")
        XCTAssertEqual(scenario.factory.childHosts.count, 1)
        XCTAssertEqual(scenario.factory.childHosts.first?.module, .userrules)
    }

    // MARK: - Singleton-per-parent policy

    func testOpenChildWindow_DuplicateCallForSameParent_ReturnsExistingWindowId() throws {
        let scenario = ChildWindowScenario.given(parentShown: true)
        let firstId = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        let secondId = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        XCTAssertEqual(firstId, secondId)
        XCTAssertEqual(scenario.factory.childHosts.count, 1)
    }

    func testOpenChildWindow_DuplicateCallForSameParent_ReShowsExistingWindow() throws {
        // Reopening for same parent should re-show existing child host.
        let scenario = ChildWindowScenario.given(parentShown: true)
        let id = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        let childHost = try XCTUnwrap(scenario.factory.childHosts.first)
        childHost.hide()
        XCTAssertEqual(childHost.state, .hidden)

        _ = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        XCTAssertEqual(id, "0")
        XCTAssertEqual(childHost.state, .shown, "Existing child window must be re-shown on duplicate open")
    }

    func testOpenChildWindow_DifferentParents_CreatesSeparateChildren() throws {
        let scenario = ChildWindowScenario.given(
            parentShown: true, secondParentShown: true
        )
        let firstId = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        let secondId = try scenario.controller.openChildWindow(
            parent: .onboarding, html: nil,
            params: ChildWindowParams(id: "1", width: 800, height: 670, caption: "Rules")
        )
        XCTAssertNotEqual(firstId, secondId)
        XCTAssertEqual(scenario.factory.childHosts.count, 2)
    }

    // MARK: - Reject when parent closed

    func testOpenChildWindow_WhenParentNeverShown_ThrowsParentClosed() {
        let scenario = ChildWindowScenario.given(parentShown: false)
        XCTAssertThrowsError(
            try scenario.controller.openChildWindow(
                parent: .settings, html: nil,
                params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
            )
        ) { error in
            guard case .parentClosed(let parent) = error as? ChildWindowError else {
                XCTFail("Expected ChildWindowError.parentClosed, got \(error)")
                return
            }
            XCTAssertEqual(parent, .settings)
        }
    }

    // MARK: - Child teardown without affecting parent

    func testCloseChildWindow_TearsDownChildHost_LeavesParentHost() throws {
        let scenario = ChildWindowScenario.given(parentShown: true)
        let id = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        let childHost = try XCTUnwrap(scenario.factory.childHosts.first)
        try scenario.controller.closeChildWindow(id)
        // Child teardown should transition state to `.destroyed`.
        XCTAssertEqual(childHost.state, .destroyed)
        // Parent host should remain alive after child close.
        XCTAssertNotNil(scenario.controller.host(for: .settings))
    }

    func testCloseChildWindow_AlreadyClosed_ThrowsAlreadyClosed() throws {
        let scenario = ChildWindowScenario.given(parentShown: true)
        let id = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        try scenario.controller.closeChildWindow(id)
        XCTAssertThrowsError(
            try scenario.controller.closeChildWindow(id)
        ) { error in
            guard case .alreadyClosed(let windowId) = error as? ChildWindowError else {
                XCTFail("Expected ChildWindowError.alreadyClosed, got \(error)")
                return
            }
            XCTAssertEqual(windowId, id)
        }
    }

    // MARK: - Reopen after close (parentChildIndex entry cleared)

    func testCloseChildWindow_ClearsParentChildIndex_AllowsReopenForSameParent() throws {
        // Closing should clear parent-child index and allow reopening.
        let scenario = ChildWindowScenario.given(parentShown: true)
        _ = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        try scenario.controller.closeChildWindow("0")
        XCTAssertEqual(scenario.factory.childHosts.count, 1)
        _ = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        XCTAssertEqual(scenario.factory.childHosts.count, 2)
    }

    // MARK: - didResignKey no-op for .userrules

    func testUserrulesHost_DidResignKey_DoesNotAutoHide() throws {
        // `.userrules` host should not auto-hide on `didResignKey()`.
        let scenario = ChildWindowScenario.given(parentShown: true)
        let id = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        let childHost = try XCTUnwrap(scenario.factory.childHosts.first)
        let stateBefore = childHost.state
        childHost.didResignKey()
        XCTAssertEqual(
            childHost.state,
            stateBefore,
            "A `.userrules` child host must NOT auto-hide on resignKey (US7.3)."
        )
        XCTAssertNotNil(scenario.controller.host(for: .settings))
        try scenario.controller.closeChildWindow(id)
        XCTAssertEqual(childHost.state, .destroyed)
    }
}

// MARK: - Geometry persistence across close/reopen

/// The user-rules editor must reopen with the size and position the user
/// left it in, not with the configured default.
final class ChildWindowGeometryPersistenceTests: XCTestCase {
    /// Unique autosave key for this test, so a persisted frame neither reads
    /// nor writes the real module's slot (tests run in parallel processes
    /// sharing one defaults domain).
    private var autosaveKey = ""

    override func setUp() {
        super.setUp()
        self.autosaveKey = "AdguardMiniTests.UserRulesEditor.\(UUID().uuidString)"
    }

    override func tearDown() {
        NSWindow.removeFrame(usingName: self.autosaveKey)
        super.tearDown()
    }

    /// Persists `frame` under the test's autosave key — the same write
    /// AppKit performs when the user moves or resizes the editor.
    private func seedSavedFrame(_ frame: CGRect) {
        let window = NSWindow(
            contentRect: .zero,
            styleMask: [.titled, .resizable],
            backing: .buffered,
            defer: false
        )
        window.isReleasedWhenClosed = false
        window.setFrame(frame, display: false)
        window.saveFrame(usingName: self.autosaveKey)
    }

    /// The frame size a window with `host`'s style mask gets for `contentSize`.
    private func frameSize(forContentSize contentSize: CGSize, of host: WKWebViewAppHost) -> CGSize {
        NSWindow.frameRect(
            forContentRect: CGRect(origin: .zero, size: contentSize),
            styleMask: host.window.styleMask
        ).size
    }

    func testOpenChildWindow_NoSavedFrame_AppliesRequestedSizeAndCentersOverParent() throws {
        let scenario = ChildWindowScenario.given(
            parentShown: true,
            userrulesFrameAutosaveKey: self.autosaveKey
        )
        _ = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 640, height: 480, caption: "Rules")
        )
        let childHost = try XCTUnwrap(scenario.factory.childHosts.first)
        let expectedSize = self.frameSize(
            forContentSize: CGSize(width: 640, height: 480),
            of: childHost
        )
        XCTAssertEqual(childHost.window.frame.width, expectedSize.width, accuracy: 0.5)
        XCTAssertEqual(childHost.window.frame.height, expectedSize.height, accuracy: 0.5)

        let parentFrame = try XCTUnwrap(scenario.controller.host(for: .settings)).window.frame
        XCTAssertEqual(childHost.window.frame.midX, parentFrame.midX, accuracy: 0.5)
        XCTAssertEqual(childHost.window.frame.midY, parentFrame.midY, accuracy: 0.5)
    }

    func testOpenChildWindow_RestoredFrame_WinsOverRequestedSize() throws {
        let saved = CGRect(x: 300, y: 300, width: 620, height: 460)
        self.seedSavedFrame(saved)

        let scenario = ChildWindowScenario.given(
            parentShown: true,
            userrulesFrameAutosaveKey: self.autosaveKey
        )
        _ = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        let childHost = try XCTUnwrap(scenario.factory.childHosts.first)
        XCTAssertEqual(childHost.window.frame.width, saved.width, accuracy: 0.5)
        XCTAssertEqual(childHost.window.frame.height, saved.height, accuracy: 0.5)
    }

    func testCloseThenReopen_KeepsUserResizedFrame() throws {
        let scenario = ChildWindowScenario.given(
            parentShown: true,
            userrulesFrameAutosaveKey: self.autosaveKey
        )
        _ = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        let firstHost = try XCTUnwrap(scenario.factory.childHosts.first)
        let resized = CGRect(x: 260, y: 240, width: 620, height: 460)
        firstHost.window.setFrame(resized, display: false)
        try scenario.controller.closeChildWindow("0")

        _ = try scenario.controller.openChildWindow(
            parent: .settings, html: nil,
            params: ChildWindowParams(id: "0", width: 800, height: 670, caption: "Rules")
        )
        let secondHost = try XCTUnwrap(scenario.factory.childHosts.last)
        XCTAssertEqual(secondHost.window.frame.width, resized.width, accuracy: 0.5)
        XCTAssertEqual(secondHost.window.frame.height, resized.height, accuracy: 0.5)
    }
}

// MARK: - Test scenario + real-host factory

private final class RealHostFactory {
    /// Captures hosts created by the factory.
    var createdHosts: [WKWebViewAppHost] = []
    /// Frame autosave key for `.userrules` hosts. Tests that need hermetic
    /// frame persistence pass a unique key; `nil` keeps the module's own.
    var userrulesFrameAutosaveKey: String?
    /// Child (`.userrules`) hosts only.
    var childHosts: [WKWebViewAppHost] {
        createdHosts.filter { $0.module == .userrules }
    }

    func make(module: ModuleId) -> WKWebViewAppHost {
        // Build real host with test entry URL and no-op bridge setup.
        let host = WKWebViewAppHost(
            module: module,
            entryURL: URL(fileURLWithPath: "/tmp/"),
            onVisibilityChange: nil,
            integrityVerifier: WebUIIntegrityVerifier.noOp,
            bridgeSetup: { _ in },
            extraMessageHandlersSetup: nil,
            frameAutosaveKeyOverride: module == .userrules ? self.userrulesFrameAutosaveKey : nil
        )
        createdHosts.append(host)
        return host
    }
}

private struct ChildWindowScenario {
    let controller: WebViewAppsController
    let factory: RealHostFactory

    static func given(
        parentShown: Bool,
        secondParentShown: Bool = false,
        userrulesFrameAutosaveKey: String? = nil
    ) -> ChildWindowScenario {
        let factory = RealHostFactory()
        factory.userrulesFrameAutosaveKey = userrulesFrameAutosaveKey
        let controller = WebViewAppsController { module in
            factory.make(module: module)
        }
        if parentShown {
            controller.show(.settings)
        }
        if secondParentShown {
            controller.show(.onboarding)
        }
        return ChildWindowScenario(controller: controller, factory: factory)
    }
}
