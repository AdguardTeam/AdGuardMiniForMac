// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ModuleCapabilitiesInternalServiceTests.swift
//  AdguardMiniTests
//

import XCTest

/// Snapshot of per-module `InternalService` caller audit.
/// Update only when shipped TS callers change.
final class ModuleCapabilitiesInternalServiceTests: XCTestCase {
    func testInternalServiceSubsets_MatchAuditedCallers() {
        XCTAssertEqual(
            ModuleCapabilities.internalServiceMethods(for: .settings),
            Set(["OpenUserRulesWindow", "ShowInFinder", "reportAnIssue"])
        )
        XCTAssertEqual(
            ModuleCapabilities.internalServiceMethods(for: .tray),
            Set(["OpenSettingsWindow"])
        )
        XCTAssertTrue(ModuleCapabilities.internalServiceMethods(for: .onboarding).isEmpty)
        XCTAssertEqual(
            ModuleCapabilities.internalServiceMethods(for: .userrules),
            Set(["CloseUserRulesWindow", "GetSystemLanguage", "reportAnIssue"])
        )
    }
}
