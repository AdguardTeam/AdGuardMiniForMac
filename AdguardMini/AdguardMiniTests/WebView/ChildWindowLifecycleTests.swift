// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ChildWindowLifecycleTests.swift
//  AdguardMiniTests
//

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

// MARK: - Test scenario + real-host factory

private final class RealHostFactory {
    /// Captures hosts created by the factory.
    var createdHosts: [WKWebViewAppHost] = []
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
            bridgeSetup: { _ in },
            extraMessageHandlersSetup: nil
        )
        createdHosts.append(host)
        return host
    }
}

private struct ChildWindowScenario {
    let controller: WebViewAppsController
    let factory: RealHostFactory

    static func given(parentShown: Bool, secondParentShown: Bool = false) -> ChildWindowScenario {
        let factory = RealHostFactory()
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
