// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  EditMenuBuilder.swift
//  AdguardMini
//

import Cocoa

/// Titles for the standard Edit menu items.
struct EditMenuTitles {
    let undo: String
    let redo: String
    let cut: String
    let copy: String
    let paste: String
    let delete: String
    let selectAll: String
}

/// Builds the items for the app's Edit menu.
///
/// WKWebView implements the standard editing responder actions (`copy:`,
/// `paste:`, `cut:`, `selectAll:`, ...), but AppKit only recognizes their
/// key equivalents (Cmd+C, Cmd+V, Cmd+X, Cmd+A, Cmd+Z) when matching
/// main-menu items exist. Without the Edit menu the shortcuts are swallowed
/// everywhere in the WebView UI, while paste still works from WebKit's own
/// context menu (which bypasses the app menu entirely). Every item uses a
/// nil target so its action is routed through the responder chain to the
/// focused WKWebView.
enum EditMenuBuilder {
    /// Returns the Edit menu items, separators included.
    static func makeItems(titles: EditMenuTitles) -> [NSMenuItem] {
        let redoItem = NSMenuItem(
            title: titles.redo,
            action: Selector(("redo:")),
            keyEquivalent: "z"
        )
        redoItem.keyEquivalentModifierMask = [.command, .shift]

        return [
            NSMenuItem(
                title: titles.undo,
                action: Selector(("undo:")),
                keyEquivalent: "z"
            ),
            redoItem,
            NSMenuItem.separator(),
            NSMenuItem(
                title: titles.cut,
                action: #selector(NSText.cut(_:)),
                keyEquivalent: "x"
            ),
            NSMenuItem(
                title: titles.copy,
                action: #selector(NSText.copy(_:)),
                keyEquivalent: "c"
            ),
            NSMenuItem(
                title: titles.paste,
                action: #selector(NSText.paste(_:)),
                keyEquivalent: "v"
            ),
            NSMenuItem(
                title: titles.delete,
                action: #selector(NSText.delete(_:)),
                keyEquivalent: ""
            ),
            NSMenuItem.separator(),
            NSMenuItem(
                title: titles.selectAll,
                action: #selector(NSText.selectAll(_:)),
                keyEquivalent: "a"
            )
        ]
    }
}
