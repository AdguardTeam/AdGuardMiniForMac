// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TrayWindowConfigurationTests.swift
//  AdguardMiniTests
//

import XCTest
import AppKit
import WebKit
import ProtoSchema

final class TrayWindowConfigurationTests: XCTestCase {
    func testTrayConfig_HasStatusBarLevelAndNonactivatingPanelStyle() {
        let config = ModuleWindowConfigurator.config(for: .tray)
        XCTAssertEqual(config.level, .statusBar)
        XCTAssertTrue(config.styleMask.contains(.nonactivatingPanel))
        XCTAssertTrue(config.styleMask.contains(.fullSizeContentView))
        XCTAssertFalse(config.styleMask.contains(.resizable))
        XCTAssertFalse(config.styleMask.contains(.closable))
        XCTAssertFalse(config.styleMask.contains(.miniaturizable))
    }

    func testTrayConfig_NoAutosaveMovableFalsePopoverVibrancyTransparent() {
        let config = ModuleWindowConfigurator.config(for: .tray)
        XCTAssertNil(config.frameAutosaveKey)
        XCTAssertFalse(config.isMovable)
        XCTAssertEqual(config.vibrancyMaterial, .popover)
        XCTAssertTrue(config.isTransparent)
        XCTAssertEqual(config.titleVisibility, .hidden)
        XCTAssertTrue(config.titlebarAppearsTransparent)
        XCTAssertEqual(
            config.collectionBehavior,
            [.moveToActiveSpace, .fullScreenAuxiliary]
        )
        XCTAssertEqual(config.contentFrame, CGRect(x: 100, y: 100, width: 360, height: 582))
        XCTAssertNotNil(config.cornerRadius)
    }

    func testUserrulesConfig_PreservesExistingValues() {
        let config = ModuleWindowConfigurator.config(for: .userrules)
        XCTAssertEqual(config.contentFrame, CGRect(x: 0, y: 0, width: 800, height: 670))
        XCTAssertTrue(config.styleMask.contains(.titled))
        XCTAssertFalse(config.isTransparent)
        XCTAssertNil(config.vibrancyMaterial)
    }
}

final class TrayWindowHostConfigurationTests: XCTestCase {
    private func makeTrayHost() -> WKWebViewAppHost {
        WKWebViewAppHost(
            module: .tray,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/tray.html"),
            onVisibilityChange: nil
        ) { _ in
            // No services needed for config test.
        }
    }

    func testTrayHost_WindowIsNonactivatingPanelAtStatusBarLevel() {
        let host = makeTrayHost()
        XCTAssertTrue(host.window is NSPanel)
        XCTAssertEqual(host.window.level, .statusBar)
        guard let panel = host.window as? NSPanel else {
            XCTFail("window must be an NSPanel")
            return
        }
        XCTAssertTrue(panel.styleMask.contains(.nonactivatingPanel))
        XCTAssertFalse(panel.isMovable)
        XCTAssertEqual(panel.collectionBehavior, [.moveToActiveSpace, .fullScreenAuxiliary])
        XCTAssertEqual(panel.titleVisibility, .hidden)
        XCTAssertTrue(panel.titlebarAppearsTransparent)
    }

    func testTrayHost_TransparencyVibrancyAndCornerRadiusApplied() {
        let host = makeTrayHost()
        // Check stable panel properties.
        XCTAssertNotNil(host.vibrancyView, "vibrancyView")
        if let vibrancy = host.vibrancyView {
            XCTAssertEqual(vibrancy.material, .popover, "material")
            XCTAssertEqual(vibrancy.layer?.cornerRadius, 10, "cornerRadius")
        }
        // The tray panel is transparent (`.clear` background, non-opaque),
        // Matching the sibling `testWindowConfig_BackgroundColorIsClear_PerDecision1`.
        XCTAssertEqual(host.window.backgroundColor, .clear, "tray panel background must be clear")
        XCTAssertFalse(host.window.isOpaque, "tray panel must be non-opaque")
    }
}

// MARK: - Outside-click and visibility deferral

private final class VisibilityRecorder {
    var calls: [Bool] = []
    func handle(_ visible: Bool) { calls.append(visible) }
}

final class TrayVisibilityLifecycleTests: XCTestCase {
    private func makeTrayHost(recorder: VisibilityRecorder) -> WKWebViewAppHost {
        WKWebViewAppHost(
            module: .tray,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/tray.html"),
            onVisibilityChange: { recorder.handle($0) }
        ) { _ in }
    }

    private func makeTrayHost() -> WKWebViewAppHost {
        WKWebViewAppHost(
            module: .tray,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/tray.html"),
            onVisibilityChange: nil
        ) { _ in }
    }

    func testResignKey_IsNoOp_DoesNotAutoHide() {
        // State-transition test only: `didResignKey()` is intentionally a no-op.
        // Click-outside-to-close is handled by the global outside-click monitor
        // (verified manually), so the tray must NOT auto-hide on resignKey: it
        // Fires spuriously right after `makeKeyAndOrderFront` on the
        // Non-activating NSPanel.
        let host = makeTrayHost()
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        host.show()
        XCTAssertEqual(host.state, .shown, "state after show")
        let stateBefore = host.state
        host.didResignKey()
        XCTAssertEqual(host.state, stateBefore, "tray must NOT auto-hide on didResignKey")
    }

    func testTrayHost_VisibilityCallback_FiresOnShowAndHide() {
        // Ready host should notify on show/hide.
        let recorder = VisibilityRecorder()
        let host = makeTrayHost(recorder: recorder)
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        host.show()
        XCTAssertEqual(recorder.calls, [true], "onVisibilityChange(true) on show")
        host.hide()
        XCTAssertEqual(recorder.calls, [true, false], "onVisibilityChange(false) on hide")
    }

    func testTrayHost_ShowThenHide_TransitionsStateCorrectly() {
        let recorder = VisibilityRecorder()
        let host = makeTrayHost(recorder: recorder)
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        // Check state transitions only.
        XCTAssertEqual(host.state, .ready)
        host.show()
        XCTAssertEqual(host.state, .shown)
        host.hide()
        XCTAssertEqual(host.state, .hidden)
    }

    // `show()` should defer visibility callback until navigation finishes.
    func testShow_DefersOnVisibilityChangeUntilNavigationCompletes() {
        let recorder = VisibilityRecorder()
        let host = makeTrayHost(recorder: recorder)

        // State .unloaded -> .loading.
        host.show()
        XCTAssertEqual(host.state, .loading)
        XCTAssertEqual(recorder.calls, [], "visibility change must be deferred until navigation completes")

        // State .loading -> .ready -> .shown.
        host.didFinishNavigation()
        XCTAssertEqual(host.state, .shown)
        XCTAssertEqual(recorder.calls, [true])
    }
}
