// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  EditMenuBuilderTests.swift
//  AdguardMiniTests
//

import XCTest
import AppKit

final class EditMenuBuilderTests: XCTestCase {
    private func makeTitles() -> EditMenuTitles {
        EditMenuTitles(
            undo: "Undo",
            redo: "Redo",
            cut: "Cut",
            copy: "Copy",
            paste: "Paste",
            delete: "Delete",
            selectAll: "Select All"
        )
    }

    /// Built items with separators filtered out.
    private func editingItems() -> [NSMenuItem] {
        EditMenuBuilder.makeItems(titles: self.makeTitles())
            .filter { !$0.isSeparatorItem }
    }

    func testEditMenu_WiresStandardKeyEquivalents() {
        let items = self.editingItems()
        XCTAssertEqual(items.map(\.keyEquivalent), ["z", "z", "x", "c", "v", "", "a"])
        // `NSMenuItem` defaults to `.command` even for an empty key equivalent
        // (Delete), so only Redo differs (Shift+Cmd+Z).
        XCTAssertEqual(
            items.map(\.keyEquivalentModifierMask),
            [
                [.command],
                [.command, .shift],
                [.command],
                [.command],
                [.command],
                [.command],
                [.command]
            ]
        )
    }

    func testEditMenu_WiresStandardEditingActions() {
        let items = self.editingItems()
        XCTAssertEqual(
            items.map(\.action),
            [
                Selector(("undo:")),
                Selector(("redo:")),
                #selector(NSText.cut(_:)),
                #selector(NSText.copy(_:)),
                #selector(NSText.paste(_:)),
                #selector(NSText.delete(_:)),
                #selector(NSText.selectAll(_:))
            ]
        )
    }

    func testEditMenu_ItemsRouteThroughResponderChain() {
        let items = self.editingItems()
        XCTAssertTrue(
            items.allSatisfy { $0.target == nil },
            "nil targets route the actions to the focused WKWebView via the responder chain"
        )
    }

    func testEditMenu_UsesProvidedTitles() {
        let items = self.editingItems()
        XCTAssertEqual(items.map(\.title), ["Undo", "Redo", "Cut", "Copy", "Paste", "Delete", "Select All"])
    }

    func testEditMenu_SeparatorsGroupItems() {
        let items = EditMenuBuilder.makeItems(titles: self.makeTitles())
        let separatorIndexes = items.indices.filter { items[$0].isSeparatorItem }
        XCTAssertEqual(separatorIndexes, [2, 7])
    }
}
