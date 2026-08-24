// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ChildWindowCloseCallbackTests.swift
//  AdguardMiniTests
//

import XCTest
import ProtoSchema

/// Verifies `closeChildWindow` tears down host and triggers close callback once.
final class ChildWindowCloseCallbackTests: XCTestCase {
    func testCloseChildWindowInvokesOnChildWindowClosed() throws {
        var closedIds: [WindowId] = []
        let controller = WebViewAppsController(
            hostFactory: {
                WKWebViewAppHost(
                    module: $0,
                    entryURL: URL(fileURLWithPath: "/tmp/"),
                    onVisibilityChange: nil,
                    bridgeSetup: { _ in },
                    extraMessageHandlersSetup: nil
                )
            },
            onChildWindowClosed: { closedIds.append($0) }
        )
        controller.show(.settings)

        let id = try controller.openChildWindow(
            parent: .settings,
            html: nil,
            params: ChildWindowParams(
                id: ChildWindow.userRuleEditorWindowId,
                width: 800,
                height: 670,
                caption: "x"
            )
        )
        try controller.closeChildWindow(id)

        XCTAssertEqual(closedIds, [ChildWindow.userRuleEditorWindowId])
    }
}
