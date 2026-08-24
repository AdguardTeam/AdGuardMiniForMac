// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebViewAppsControllerIdleTeardownTests.swift
//  AdguardMiniTests
//

import XCTest
import ProtoSchema

/// Covers the idle teardown: reapable hosts die once nothing has been
/// visible for `idleTimeout`, and every "poke a window whose teardown is
/// pending" path resolves to either a cancelled teardown or a fresh host.
///
/// Main-actor-bound because the controller's state and the reaper's task both
/// live there; `await` inside a test yields the actor so the reaper can run.
@MainActor
final class WebViewAppsControllerIdleTeardownTests: XCTestCase {
    private enum Constants {
        /// Short enough to keep the suite fast, long enough that a busy
        /// Machine cannot fire the reaper before the test arranges its state.
        static let idleTimeout: TimeInterval = 0.1

        /// Comfortably past `idleTimeout`. Only used for the negative
        /// Assertions ("must still be alive"), where waiting too little can
        /// Mask a bug but can never invent a failure.
        static let settleDelay: TimeInterval = 0.5

        /// Deadline for the positive assertions ("must be gone"). Generous
        /// Because the reap runs on the main actor and the full suite runs
        /// Several test processes at once.
        static let reapDeadline: TimeInterval = 5

        /// Polling interval while waiting for a reap.
        static let pollInterval: TimeInterval = 0.02
    }

    private func makeController() -> WebViewAppsController {
        let synthURL = URL(fileURLWithPath: "/tmp/WebUI/settings.html")
        // Every host the factory hands out, so the teardown block below can
        // Release the windows and web views of hosts a test leaves alive —
        // An exempt module, or one still pinned when the test ends.
        // `teardown()` is idempotent, so already-reaped hosts are fine.
        var created: [WKWebViewAppHost] = []
        let controller = WebViewAppsController(
            hostFactory: { module in
                let host = WKWebViewAppHost(
                    module: module,
                    entryURL: synthURL,
                    onVisibilityChange: nil
                ) { _ in }
                created.append(host)
                return host
            },
            idleTimeout: Constants.idleTimeout
        )
        self.addTeardownBlock { created.forEach { $0.teardown() } }
        return controller
    }

    /// Lets the armed countdown elapse without asserting anything about the
    /// Outcome. For "must still be alive" checks only.
    private func waitOutIdleTimeout() async {
        try? await Task.sleep(seconds: Constants.settleDelay)
    }

    /// Polls until `condition` holds, failing at the deadline.
    ///
    /// The reap is driven by a task hopping onto the main actor, so a fixed
    /// Sleep would make every positive assertion hostage to scheduler latency
    /// On a loaded machine.
    private func waitUntil(
        _ message: String,
        file: StaticString = #filePath,
        line: UInt = #line,
        condition: () -> Bool
    ) async {
        // `DispatchTime` is monotonic. A deadline built from `Date()` rides
        // The wall clock, so an NTP step mid-test can cut the wait short or
        // Stretch it. `CACurrentMediaTime()` would serve too, but it would
        // Drag QuartzCore into a file that needs nothing else from it.
        let deadline = DispatchTime.now() + Constants.reapDeadline
        while DispatchTime.now() < deadline {
            if condition() {
                return
            }
            // Without this, a cancelled test spins the loop at full speed
            // Until the deadline: `Task.sleep` throws immediately once
            // Cancelled and `try?` swallows it.
            guard !Task.isCancelled else { return }
            try? await Task.sleep(seconds: Constants.pollInterval)
        }
        XCTFail(message, file: file, line: line)
    }

    // MARK: - Reaping

    func testPreparedHost_IsReapedAfterIdleTimeout() async {
        let controller = self.makeController()
        controller.prepareHost(for: .tray)
        XCTAssertNotNil(controller.host(for: .tray))

        await self.waitUntil("a prepared host that was never shown must be reaped") {
            controller.host(for: .tray) == nil
        }
    }

    /// The reap must drop the map entry in the same turn it tears the host
    /// Down, so no caller can ever be handed a `.destroyed` host.
    func testReap_LeavesNoDestroyedHostReachable() async {
        let controller = self.makeController()
        controller.prepareHost(for: .settings)
        controller.prepareHost(for: .tray)

        await self.waitUntil("both reapable hosts must be gone from the map") {
            controller.host(for: .settings) == nil && controller.host(for: .tray) == nil
        }
    }

    /// Onboarding is exempt: it is a modal first-run flow with no menu-bar
    /// Affordance to bring it back.
    func testReap_SkipsOnboarding() async {
        let controller = self.makeController()
        controller.prepareHost(for: .onboarding)
        controller.prepareHost(for: .tray)

        await self.waitUntil("the reapable host must be gone") {
            controller.host(for: .tray) == nil
        }
        XCTAssertNotNil(controller.host(for: .onboarding), "onboarding is exempt")
    }

    // MARK: - Rebuilding after a reap

    func testShowAfterReap_BuildsAFreshLiveHost() async {
        let controller = self.makeController()
        controller.prepareHost(for: .settings)
        await self.waitUntil("the idle host must be reaped first") {
            controller.host(for: .settings) == nil
        }

        controller.show(.settings)

        let rebuilt = controller.host(for: .settings)
        XCTAssertNotNil(rebuilt)
        XCTAssertNotEqual(rebuilt?.state, .destroyed)
        XCTAssertNotEqual(rebuilt?.state, .tearingDown)
    }

    /// A host torn down by something other than the reaper is still in the
    /// Map; `show` must replace it rather than poke the corpse.
    func testShow_ReplacesAnExternallyTornDownHost() {
        let controller = self.makeController()
        controller.show(.settings)
        guard let stale = controller.host(for: .settings) else {
            XCTFail("settings host was not created")
            return
        }
        stale.teardown()
        XCTAssertEqual(stale.state, .destroyed)

        controller.show(.settings)

        let replacement = controller.host(for: .settings)
        XCTAssertNotIdentical(replacement, stale)
        XCTAssertNotEqual(replacement?.state, .destroyed)
    }

    // MARK: - Cancelling a pending teardown

    func testShow_CancelsAPendingReap() async {
        let controller = self.makeController()
        controller.prepareHost(for: .tray)
        let prepared = controller.host(for: .tray)

        controller.show(.tray)
        await self.waitOutIdleTimeout()

        XCTAssertIdentical(controller.host(for: .tray), prepared)
    }

    // MARK: - Show intent

    /// The tray click path creates its host, then `await`s before showing it.
    /// The intent is what stops the reaper from destroying the host the
    /// Caller is already holding.
    func testShowIntent_SuppressesReapUntilReleased() async {
        let controller = self.makeController()
        controller.beginShowIntent(for: .tray)
        controller.prepareHost(for: .tray)

        await self.waitOutIdleTimeout()
        XCTAssertNotNil(controller.host(for: .tray), "intent must pin the host")

        controller.endShowIntent(for: .tray)

        await self.waitUntil("releasing the intent re-arms the countdown") {
            controller.host(for: .tray) == nil
        }
    }

    /// Overlapping shows of the same module must not un-pin it early.
    func testShowIntent_IsCounted() async {
        let controller = self.makeController()
        controller.beginShowIntent(for: .tray)
        controller.beginShowIntent(for: .tray)
        controller.prepareHost(for: .tray)

        controller.endShowIntent(for: .tray)
        await self.waitOutIdleTimeout()

        XCTAssertNotNil(controller.host(for: .tray), "one outstanding intent still pins the host")

        controller.endShowIntent(for: .tray)
        await self.waitUntil("the last intent released, so the host is reapable again") {
            controller.host(for: .tray) == nil
        }
    }

    // MARK: - Windows the reaper must not touch

    /// A window minimized to the Dock reports itself invisible, so nothing
    /// But an explicit `isMiniaturized` check keeps the reaper off it.
    /// Destroying it would make the Dock entry disappear along with whatever
    /// The page was holding.
    func testMinimizedWindow_IsNotReaped() async {
        let controller = self.makeController()
        controller.show(.settings)
        guard let settings = controller.host(for: .settings) else {
            XCTFail("settings host was not created")
            return
        }
        settings.window.miniaturize(nil)
        try? await Task.sleep(seconds: Constants.pollInterval)

        XCTAssertTrue(settings.window.isMiniaturized, "precondition: the window is minimized")
        XCTAssertFalse(settings.window.isVisible, "precondition: `isVisible` lies once minimized")

        // A path that arms the countdown. Before the `isMiniaturized` check
        // This armed and the next round destroyed the minimized window.
        controller.prepareHost(for: .tray)
        await self.waitOutIdleTimeout()

        XCTAssertNotNil(controller.host(for: .settings), "a minimized window must survive")
    }

    // MARK: - Child windows

    /// The user-rules editor is a child of settings and may hold unsaved
    /// Changes, so an open editor pins the whole group.
    func testOpenChildWindow_PinsSettingsAgainstReap() async throws {
        let controller = self.makeController()
        controller.prepareHost(for: .settings)
        let params = ChildWindowParams(
            id: ChildWindow.userRuleEditorWindowId,
            width: 400,
            height: 300,
            caption: "editor"
        )
        _ = try controller.openChildWindow(parent: .settings, html: nil, params: params)

        await self.waitOutIdleTimeout()
        XCTAssertNotNil(controller.host(for: .settings), "an open editor must pin its parent")

        try controller.closeChildWindow(ChildWindow.userRuleEditorWindowId)

        await self.waitUntil("closing the editor re-arms the countdown") {
            controller.host(for: .settings) == nil
        }
    }

    /// Only a child window the user can still see pins the group. The editor
    /// Hides itself rather than closing when its page never became ready
    /// (`windowShouldClose` falls back to `hide()`), and such a host stays in
    /// The child map — pinning on mere existence left it blocking every reap
    /// For the rest of the process' life.
    func testHiddenChildWindow_DoesNotPinTheGroup() async throws {
        let controller = self.makeController()
        controller.prepareHost(for: .settings)
        let params = ChildWindowParams(
            id: ChildWindow.userRuleEditorWindowId,
            width: 400,
            height: 300,
            caption: "editor"
        )
        _ = try controller.openChildWindow(parent: .settings, html: nil, params: params)

        controller.childHost(for: ChildWindow.userRuleEditorWindowId)?.hide()

        await self.waitUntil("a hidden editor must not pin the group") {
            controller.host(for: .settings) == nil
        }
    }
}
