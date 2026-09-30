// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ChildWindow.swift
//  AdguardMini
//

import Foundation

/// Child window identifier.
typealias WindowId = String

/// Child window constants.
enum ChildWindow {
    /// User-rules editor window id.
    static let userRuleEditorWindowId: WindowId = "0"
}

/// Child window open parameters.
struct ChildWindowParams {
    let id: WindowId
    /// Initial content width, applied only when the child has no frame
    /// persisted from an earlier open.
    let width: Int
    /// Initial content height, applied only when the child has no frame
    /// persisted from an earlier open.
    let height: Int
    let caption: String
}

/// Child window operation errors.
enum ChildWindowError: Error {
    /// Parent host is not available.
    case parentClosed(parent: ModuleId)
    /// Window was already closed or not found.
    case alreadyClosed(windowId: WindowId)
}

/// Child window controller seam.
protocol ChildWindowControlling: AnyObject {
    /// Opens or returns a child window.
    func openChildWindow(
        parent: ModuleId,
        html: URL?,
        params: ChildWindowParams
    ) throws -> WindowId

    /// Closes a child window.
    func closeChildWindow(_ windowId: WindowId) throws
}
