// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UserrulesWindowConfigurationTests.swift
//  AdguardMiniTests
//

import XCTest

/// Tests for `ModuleWindowConfigurator.config(for: .userrules)`.
final class UserrulesWindowConfigurationTests: XCTestCase {
    func testUserrulesConfig_HasTitledClosableMiniaturizableResizableStyleMask() {
        let config = ModuleWindowConfigurator.config(for: .userrules)
        // Matches legacy user-rules editor window style flags.
        XCTAssertEqual(config.styleMask, [.titled, .closable, .miniaturizable, .resizable])
    }

    func testUserrulesConfig_LevelIsNormal() {
        XCTAssertEqual(ModuleWindowConfigurator.config(for: .userrules).level, .normal)
    }

    func testUserrulesConfig_ContentFrameIs800x670() {
        // Matches `useOpenUserRulesWindow.ts` width/height constants.
        let frame = ModuleWindowConfigurator.config(for: .userrules).contentFrame
        XCTAssertEqual(frame.width, 800)
        XCTAssertEqual(frame.height, 670)
    }

    func testUserrulesConfig_HasFrameAutosaveKey() {
        // The frame autosave key lets AppKit persist the user's editor size
        // And position across opens (same mechanism as the settings window).
        XCTAssertEqual(
            ModuleWindowConfigurator.config(for: .userrules).frameAutosaveKey,
            "AdguardMini.UserRulesEditor"
        )
    }

    func testUserrulesConfig_HasNoVibrancyMaterial() {
        XCTAssertNil(ModuleWindowConfigurator.config(for: .userrules).vibrancyMaterial)
    }

    func testUserrulesConfig_IsNotTransparent() {
        XCTAssertFalse(ModuleWindowConfigurator.config(for: .userrules).isTransparent)
    }

    func testUserrulesConfig_CenterOnScreenIsFalse() {
        XCTAssertFalse(ModuleWindowConfigurator.config(for: .userrules).centerOnScreen)
    }

    func testUserrulesConfig_WindowKindIsWindow() {
        XCTAssertEqual(ModuleWindowConfigurator.config(for: .userrules).windowKind, .window)
    }

    func testModuleIdUserrules_RawValueIsUserrules() {
        XCTAssertEqual(ModuleId.userrules.rawValue, "userrules")
    }
}
