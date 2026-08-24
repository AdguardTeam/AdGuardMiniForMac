// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewAppHostUiDelegateTests.swift
//  AdguardMiniTests
//

import XCTest
import WebKit

/// Verifies every `WKWebViewAppHost` installs `InterfaceRequestDenier` as `uiDelegate`.
final class WKWebViewAppHostUiDelegateTests: XCTestCase {
    private func makeHost(module: ModuleId) -> WKWebViewAppHost {
        WKWebViewAppHost(
            module: module,
            entryURL: URL(fileURLWithPath: "/tmp/"),
            onVisibilityChange: nil,
            bridgeSetup: { _ in },
            extraMessageHandlersSetup: module == .settings
                ? { _ in }
                : nil
        )
    }

    func testTrayHost_InstallsInterfaceRequestDenierAsUiDelegate() {
        XCTAssertTrue(makeHost(module: .tray).webView.uiDelegate is InterfaceRequestDenier)
    }

    func testSettingsHost_InstallsInterfaceRequestDenierAsUiDelegate() {
        XCTAssertTrue(makeHost(module: .settings).webView.uiDelegate is InterfaceRequestDenier)
    }

    func testOnboardingHost_InstallsInterfaceRequestDenierAsUiDelegate() {
        XCTAssertTrue(makeHost(module: .onboarding).webView.uiDelegate is InterfaceRequestDenier)
    }

    func testUserrulesHost_InstallsInterfaceRequestDenierAsUiDelegate() {
        XCTAssertTrue(makeHost(module: .userrules).webView.uiDelegate is InterfaceRequestDenier)
    }
}
