// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebViewAppsControllerTests.swift
//  AdguardMiniTests
//

import XCTest
import ProtoSchema

// Minimal test stub for config-only tests.
private final class TestThemeService: ThemeService, Service, ThemeServiceProtocol {
    func getEffectiveTheme(_ message: EmptyValue, _ promise: @escaping (EffectiveThemeValue) -> Void) {
        // No-op for config-only tests.
    }
}

final class WebViewAppsControllerTests: XCTestCase {
    // Shared factory mirroring AppDelegate wiring with test stubs.
    private func makeController() -> WebViewAppsController {
        let synthURL = URL(fileURLWithPath: "/tmp/WebUI/settings.html")
        return WebViewAppsController { module in
            WKWebViewAppHost(
                module: module,
                entryURL: synthURL,
                onVisibilityChange: nil
            ) { bridge in
                bridge.register(service: TestThemeService(), serviceName: "ThemeService")
                OnboardingCallbackService().attach(webViewBridge: bridge)
            }
        }
    }

    func testShowSettings_LazilyCreatesHost() {
        let controller = makeController()
        XCTAssertNil(controller.host(for: .settings))
        controller.show(.settings)
        XCTAssertNotNil(controller.host(for: .settings))
    }

    func testShowSettings_OnSecondCallIsNoOp() {
        let controller = makeController()
        controller.show(.settings)
        let firstHost = controller.host(for: .settings)
        controller.show(.settings)
        let secondHost = controller.host(for: .settings)
        XCTAssertIdentical(firstHost, secondHost)
    }

    func testHideSettings_IdempotentWhenNotShown() {
        let controller = makeController()
        controller.hide(.settings)
        XCTAssertNil(controller.host(for: .settings))
    }

    /// Destroying a module must tear the host down and drop it from the map
    /// In the same turn, so no caller can ever be handed a `.destroyed` host.
    func testDestroy_RemovesHostAndTearsItDown() {
        let controller = makeController()
        controller.show(.onboarding)
        let host = controller.host(for: .onboarding)
        XCTAssertNotNil(host)

        controller.destroy(.onboarding)

        XCTAssertNil(controller.host(for: .onboarding))
        XCTAssertEqual(host?.state, .destroyed)
    }

    /// Destroying a module that was never created must be a no-op.
    func testDestroy_IsNoOpWhenHostMissing() {
        let controller = makeController()
        XCTAssertNil(controller.host(for: .settings))

        controller.destroy(.settings)

        XCTAssertNil(controller.host(for: .settings))
    }

    /// A destroyed host must be rebuilt fresh by the next `show`, exactly as
    /// A first launch would build it.
    func testShowAfterDestroy_BuildsAFreshLiveHost() {
        let controller = makeController()
        controller.show(.onboarding)
        let destroyed = controller.host(for: .onboarding)
        controller.destroy(.onboarding)

        controller.show(.onboarding)

        let rebuilt = controller.host(for: .onboarding)
        XCTAssertNotIdentical(rebuilt, destroyed)
        XCTAssertNotEqual(rebuilt?.state, .destroyed)
        XCTAssertNotEqual(rebuilt?.state, .tearingDown)
    }

    /// Opening a windowed module must close the tray popover: the click that
    /// Opens the window lands inside the tray, so the outside-click monitor
    /// Does not fire and the popover would linger over the new window.
    func testShowSettings_HidesTrayHost() {
        let controller = makeController()
        controller.show(.tray)
        let trayHost = controller.host(for: .tray)
        // The fake entry URL never loads, so drive the host to `.shown` via
        // The `didFinishNavigation` test seam.
        trayHost?.didFinishNavigation()
        XCTAssertEqual(trayHost?.state, .shown)

        controller.show(.settings)

        XCTAssertEqual(trayHost?.state, .hidden)
    }

    /// Showing the tray must not hide any other module window.
    func testShowTray_DoesNotHideSettingsHost() {
        let controller = makeController()
        controller.show(.settings)
        let settingsHost = controller.host(for: .settings)
        settingsHost?.didFinishNavigation()
        XCTAssertEqual(settingsHost?.state, .shown)

        controller.show(.tray)

        XCTAssertEqual(settingsHost?.state, .shown)
    }
}
