// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  OnboardingWindowConfigurationTests.swift
//  AdguardMiniTests
//

import XCTest
import AppKit
import WebKit
import ProtoSchema

final class OnboardingWindowConfigurationTests: XCTestCase {
    func testOnboardingConfig_HasTitledClosableStyle_ExcludesResizableMiniaturizableFullScreen() {
        let config = ModuleWindowConfigurator.config(for: .onboarding)
        XCTAssertEqual(config.windowKind, .window)
        XCTAssertTrue(config.styleMask.contains(.titled))
        XCTAssertTrue(config.styleMask.contains(.closable))
        XCTAssertFalse(config.styleMask.contains(.resizable))
        XCTAssertFalse(config.styleMask.contains(.miniaturizable))
        XCTAssertFalse(config.styleMask.contains(.fullScreen))
        XCTAssertEqual(config.level, .normal)
    }

    func testOnboardingConfig_FrameAutosaveKeyIsNil() {
        let config = ModuleWindowConfigurator.config(for: .onboarding)
        // Onboarding uses fixed-size centered window without autosave.
        XCTAssertNil(config.frameAutosaveKey)
    }

    func testOnboardingConfig_NoVibrancyNoTransparencyTitleVisibleMovableTrue() {
        let config = ModuleWindowConfigurator.config(for: .onboarding)
        XCTAssertNil(config.vibrancyMaterial)
        XCTAssertNil(config.cornerRadius)
        XCTAssertFalse(config.isTransparent)
        XCTAssertEqual(config.titleVisibility, .visible)
        XCTAssertFalse(config.titlebarAppearsTransparent)
        XCTAssertTrue(config.isMovable)
        XCTAssertEqual(config.collectionBehavior, [])
        // Matches onboarding width/height constants.
        XCTAssertEqual(
            config.contentFrame,
            CGRect(x: 0, y: 0, width: 800, height: 640)
        )
    }

    /// `.onboarding` config should request window centering.
    func testOnboardingConfig_CenterOnScreenIsTrue() {
        let config = ModuleWindowConfigurator.config(for: .onboarding)
        XCTAssertTrue(config.centerOnScreen)
    }

    /// Other module configs should not request centering.
    func testOtherConfigs_CenterOnScreenIsFalse() {
        XCTAssertFalse(ModuleWindowConfigurator.config(for: .tray).centerOnScreen)
        XCTAssertFalse(ModuleWindowConfigurator.config(for: .userrules).centerOnScreen)
    }

    /// The settings window centers on first launch (no autosaved frame yet),
    /// Then restores via autosave — see `settingsWindowConfiguration()`.
    func testSettingsConfig_CentersOnFirstLaunch() {
        XCTAssertTrue(ModuleWindowConfigurator.config(for: .settings).centerOnScreen)
    }

    /// Onboarding window title should be "AdGuard Mini".
    func testOnboardingConfig_TitleIsAdGuardMini() {
        let config = ModuleWindowConfigurator.config(for: .onboarding)
        XCTAssertEqual(config.title, "AdGuard Mini")
    }
}

final class OnboardingWindowHostConfigurationTests: XCTestCase {
    private func makeOnboardingHost() -> WKWebViewAppHost {
        WKWebViewAppHost(
            module: .onboarding,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/onboarding.html"),
            onVisibilityChange: nil
        ) { _ in
            // No services needed for config test.
        }
    }

    func testOnboardingHost_WindowIsNSWindowNotPanel_NormalLevel() {
        let host = makeOnboardingHost()
        XCTAssertFalse(host.window is NSPanel)
        XCTAssertEqual(host.window.level, .normal)
    }

    func testOnboardingHost_StyleMaskExcludesResizableMiniaturizableFullScreen() {
        let host = makeOnboardingHost()
        let mask = host.window.styleMask
        XCTAssertTrue(mask.contains(.titled))
        XCTAssertTrue(mask.contains(.closable))
        XCTAssertFalse(mask.contains(.resizable))
        XCTAssertFalse(mask.contains(.miniaturizable))
        XCTAssertFalse(mask.contains(.fullScreen))
    }

    /// Host should propagate configured title to NSWindow.
    func testOnboardingHost_WindowTitleIsAdGuardMini() {
        let host = makeOnboardingHost()
        XCTAssertEqual(host.window.title, "AdGuard Mini")
    }

    func testOnboardingHost_TitleVisible_TitlebarNotTransparent() {
        let host = makeOnboardingHost()
        XCTAssertEqual(host.window.titleVisibility, .visible)
        XCTAssertFalse(host.window.titlebarAppearsTransparent)
    }

    func testOnboardingHost_NoVibrancyView_OpaqueBackground() {
        let host = makeOnboardingHost()
        XCTAssertNil(host.vibrancyView, "onboarding host has no vibrancy")
        // The transparent flow from `apply(...)` (`isOpaque = false`) is NOT
        // Applied to onboarding: the window stays an opaque NSWindow.
        XCTAssertTrue(host.window.isOpaque, "onboarding window must remain opaque")
    }

    /// Host should carry `centerOnScreen` configuration.
    func testOnboardingHost_CenterOnScreenConfigurationPropagated() {
        let host = makeOnboardingHost()
        XCTAssertTrue(host.windowConfiguration.centerOnScreen)
    }

    /// `didResignKey()` should not hide onboarding NSWindow.
    func testOnboardingHost_DidResignKeyDoesNotHide() {
        let host = makeOnboardingHost()
        // Simulate the full path: load → finish → show → resignKey.
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        host.show()
        XCTAssertEqual(host.state, .shown)
        host.didResignKey()
        XCTAssertTrue(host.window.isVisible, "onboarding NSWindow MUST stay visible after resignKey")
        XCTAssertEqual(host.state, .shown, "onboarding NSWindow MUST NOT auto-close on resignKey")
    }
}
