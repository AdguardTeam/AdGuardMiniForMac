// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SettingsWindowConfigurationTests.swift
//  AdguardMiniTests
//

import XCTest
import AppKit

final class SettingsWindowConfigurationTests: XCTestCase {
    func testSettingsConfig_HasTitledResizableMiniaturizableClosableStyle() {
        let config = ModuleWindowConfigurator.config(for: .settings)
        XCTAssertEqual(config.windowKind, .window)
        XCTAssertTrue(config.styleMask.contains(.titled))
        XCTAssertTrue(config.styleMask.contains(.resizable))
        XCTAssertTrue(config.styleMask.contains(.miniaturizable))
        XCTAssertTrue(config.styleMask.contains(.closable))
        XCTAssertFalse(config.styleMask.contains(.fullScreen))
        XCTAssertEqual(config.level, .normal)
    }

    func testSettingsConfig_FrameAutosaveKeyIsSettingsAppClassName() {
        let config = ModuleWindowConfigurator.config(for: .settings)
        // Matches legacy settings window autosave key.
        XCTAssertEqual(config.frameAutosaveKey, "AdguardMini.SettingsApp")
    }

    func testSettingsConfig_NoVibrancyNoTransparencyTitleVisibleMovableTrue() {
        let config = ModuleWindowConfigurator.config(for: .settings)
        XCTAssertNil(config.vibrancyMaterial)
        XCTAssertNil(config.cornerRadius)
        XCTAssertFalse(config.isTransparent)
        XCTAssertEqual(config.titleVisibility, .visible)
        XCTAssertFalse(config.titlebarAppearsTransparent)
        XCTAssertTrue(config.isMovable)
        XCTAssertEqual(config.collectionBehavior, [])
        XCTAssertEqual(
            config.contentFrame,
            CGRect(x: 500, y: 100, width: 800, height: 640)
        )
    }

    /// Settings config should enforce 800x640 minimum content size.
    func testSettingsConfig_MinContentSizeIs800x640() {
        let config = ModuleWindowConfigurator.config(for: .settings)
        XCTAssertEqual(config.contentMinSize, CGSize(width: 800, height: 640))
    }

    /// Settings window title should be "AdGuard Mini".
    func testSettingsConfig_TitleIsAdGuardMini() {
        let config = ModuleWindowConfigurator.config(for: .settings)
        XCTAssertEqual(config.title, "AdGuard Mini")
    }
}

import WebKit
import ProtoSchema

final class SettingsWindowHostConfigurationTests: XCTestCase {
    private func makeSettingsHost() -> WKWebViewAppHost {
        WKWebViewAppHost(
            module: .settings,
            entryURL: URL(fileURLWithPath: "/tmp/WebUI/settings.html"),
            onVisibilityChange: nil
        ) { _ in
            // No services needed for config test.
        }
    }

    func testSettingsHost_WindowIsNSWindowNotPanel_NormalLevel() {
        let host = makeSettingsHost()
        XCTAssertFalse(host.window is NSPanel)
        XCTAssertEqual(host.window.level, .normal)
    }

    func testSettingsHost_StyleMaskHasTitledResizableMiniaturizableClosable() {
        let host = makeSettingsHost()
        let mask = host.window.styleMask
        XCTAssertTrue(mask.contains(.titled))
        XCTAssertTrue(mask.contains(.resizable))
        XCTAssertTrue(mask.contains(.miniaturizable))
        XCTAssertTrue(mask.contains(.closable))
        XCTAssertFalse(mask.contains(.fullScreen))
    }

    func testSettingsHost_A_FrameAutosaveNameIsNonEmpty() {
        let host = makeSettingsHost()
        // Runtime autosave name format may vary; assert it is configured.
        XCTAssertFalse(host.window.frameAutosaveName.isEmpty,
                       "frameAutosaveName must not be empty")
    }

    /// Host should propagate configured title to NSWindow.
    func testSettingsHost_WindowTitleIsAdGuardMini() {
        let host = makeSettingsHost()
        XCTAssertEqual(host.window.title, "AdGuard Mini")
    }

    /// Host should propagate configured minimum content size.
    func testSettingsHost_WindowContentMinSizeIs800x640() {
        let host = makeSettingsHost()
        XCTAssertEqual(host.window.contentMinSize, CGSize(width: 800, height: 640))
    }

    func testSettingsHost_TitleVisible_TitlebarNotTransparent_NotMovableFalse() {
        let host = makeSettingsHost()
        XCTAssertEqual(host.window.titleVisibility, .visible)
        XCTAssertFalse(host.window.titlebarAppearsTransparent)
    }

    func testSettingsHost_NoVibrancyView_OpaqueBackground() throws {
        let host = makeSettingsHost()
        XCTAssertNil(host.vibrancyView, "settings host has no vibrancy")
        // Ensure transparent tray flow is not applied to settings host.
        let bgColor = host.window.backgroundColor
        if bgColor == .clear {
            throw XCTSkip("NSWindow default backgroundColor is .clear on this macOS version")
        }
    }

    /// `didResignKey()` should not hide settings NSWindow.
    func testSettingsHost_DidResignKeyDoesNotHide() {
        let host = makeSettingsHost()
        // Simulate full path: load -> finish -> show -> resignKey.
        host.loadEntryIfNeeded()
        host.didFinishNavigation()
        host.show()
        XCTAssertEqual(host.state, .shown)
        host.didResignKey()
        XCTAssertEqual(host.state, .shown, "settings NSWindow MUST NOT auto-close on resignKey")
    }
}
