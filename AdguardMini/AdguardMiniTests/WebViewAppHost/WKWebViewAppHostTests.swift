// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewAppHostTests.swift
//  AdguardMiniTests
//

import XCTest
import WebKit
import ProtoSchema

// Minimal `ThemeService.ServiceType` test stub.
private final class TestThemeService: ThemeService, Service, ThemeServiceProtocol {
    func getEffectiveTheme(_ message: EmptyValue, _ promise: @escaping (EffectiveThemeValue) -> Void) {
        // No-op for config-only tests.
    }
}

final class WKWebViewAppHostTests: XCTestCase {
    /// Synthetic file URL avoids `Bundle.main.url(...)` fatal path in tests.
    private func makeHost(
        module: ModuleId = .settings,
        entryURL: URL? = URL(fileURLWithPath: "/tmp/WebUI/poc.html")
    ) -> WKWebViewAppHost {
        WKWebViewAppHost(
            module: module,
            entryURL: entryURL,
            onVisibilityChange: nil
        ) { bridge in
            bridge.register(service: TestThemeService(), serviceName: "ThemeService")
            OnboardingCallbackService().attach(webViewBridge: bridge)
        }
    }

    func testWindowConfig_BackgroundColorIsClear_PerDecision1() {
        // Tray uses transparent window with vibrancy.
        let host = makeHost(module: .tray)
        XCTAssertEqual(host.window.backgroundColor, .clear)
        XCTAssertFalse(host.window.isOpaque)
    }

    func testWindowConfig_VibrancyViewMaterialIsPopover() {
        // Tray uses popover vibrancy material.
        let host = makeHost(module: .tray)
        guard let vibrancy = host.vibrancyView else {
            XCTFail("vibrancy view not installed")
            return
        }
        XCTAssertEqual(vibrancy.material, .popover)
    }

    func testWebViewConfig_UnderPageBackgroundColorIsClear() throws {
        let host = makeHost()
        if #available(macOS 12, *) {
            // `makeWebView()` sets the background to `.clear` unconditionally.
            // WKWebView returns the cleared color in sRGB (0 0 0 0), whereas
            // `.clear` is a Generic Gray color — same transparency, different
            // Colorspace. Compare the alpha component rather than equality.
            XCTAssertEqual(host.webView.underPageBackgroundColor.cgColor.alpha, 0)
        } else {
            throw XCTSkip("underPageBackgroundColor requires macOS 12+")
        }
    }

    // `drawsBackground` has no public setter on macOS, so `makeWebView()`
    // Disables it via KVC. Reading it back through the same KVC path keeps
    // The assertion honest about what the production code sets.
    func testWebViewConfig_DrawsBackgroundIsDisabled() throws {
        let host = makeHost()
        let drawsBackground = try XCTUnwrap(
            host.webView.value(forKey: "drawsBackground") as? Bool
        )
        XCTAssertFalse(drawsBackground, "the web view backing layer must stay transparent during load")
    }

    func testEntryURL_ResolvesToInjectedURL() throws {
        let injected = URL(fileURLWithPath: "/tmp/WebUI/settings.html")
        let resolved = WKWebViewAppHost.resolveEntryURL(module: .settings, entryURL: injected)
        XCTAssertEqual(resolved, injected, "Injected entry URL must be returned unchanged")
    }

    func testLoadFileURL_ReadAccessRestrictedToEntryDirectory() throws {
        let entry = URL(fileURLWithPath: "/tmp/WebUI/settings.html")
        let host = makeHost(module: .settings, entryURL: entry)
        host.loadEntryIfNeeded()
        XCTAssertEqual(
            host.lastLoadFileURLAllowingReadAccessTo,
            entry.deletingLastPathComponent(),
            "read access must be confined to the entry page's directory"
        )
    }

    // `isInspectable` is available only on macOS 13.3+.
    func testInspectableDebugOn_ReleaseOff() throws {
        let host = makeHost()
        if #available(macOS 13.3, *) {
            #if DEBUG
            XCTAssertTrue(host.webView.isInspectable)
            #else
            XCTAssertFalse(host.webView.isInspectable)
            #endif
        } else {
            // Skip on macOS versions without `isInspectable`.
            throw XCTSkip("WKWebView.isInspectable requires macOS 13.3+")
        }
    }

    // Regression guard for bridge and content controller construction.
    func testHost_ConstructsBridgeAndUserContentController_BestEffortGuard() {
        let host = makeHost()
        XCTAssertNotNil(host.bridge, "WKWebViewBridge must be constructed in init")
        XCTAssertNotNil(
            host.webView.configuration.userContentController,
            "WKUserContentController must be installed by makeWebView()"
        )
    }
}
