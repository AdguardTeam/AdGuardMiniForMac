// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ChildWindowTypesTests.swift
//  AdguardMiniTests
//

import XCTest

/// Tests for child-window model types.
final class ChildWindowTypesTests: XCTestCase {
    func testWindowIdIsStringTypeAlias() {
        let id: WindowId = "0"
        XCTAssertEqual(id, "0")
    }

    func testChildWindowParams_StoresIdWidthHeightCaption() {
        let params = ChildWindowParams(
            id: "0", width: 800, height: 670, caption: "User Rules"
        )
        XCTAssertEqual(params.id, "0")
        XCTAssertEqual(params.width, 800)
        XCTAssertEqual(params.height, 670)
        XCTAssertEqual(params.caption, "User Rules")
    }

    func testChildWindowError_ParentClosedCarriesParentModuleId() {
        let error = ChildWindowError.parentClosed(parent: .settings)
        if case .parentClosed(let parent) = error {
            XCTAssertEqual(parent, .settings)
        } else {
            XCTFail("Expected .parentClosed case")
        }
    }

    func testChildWindowError_AlreadyClosedCarriesWindowId() {
        let error = ChildWindowError.alreadyClosed(windowId: "0")
        if case .alreadyClosed(let windowId) = error {
            XCTAssertEqual(windowId, "0")
        } else {
            XCTFail("Expected .alreadyClosed case")
        }
    }
}
