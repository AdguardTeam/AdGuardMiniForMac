// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailAppOpener.swift
//  AdguardMini
//

import AppKit
import Foundation

import AML

/// Opens Apple Mail and the Apple Mail extension settings.
protocol MailAppOpening {
    /// Opens the Apple Mail application.
    func openAppleMail()

    /// Opens Apple Mail with the Extensions settings pane selected.
    func openMailExtensionSettings()
}

/// Test seam for the workspace calls the opener relies on.
protocol MailAppWorkspaceOpening {
    /// Opens the given URL, returning whether a handler accepted it.
    @discardableResult
    func open(_ url: URL) -> Bool

    /// Returns the URL of the application with the given bundle identifier.
    func urlForApplication(withBundleIdentifier bundleIdentifier: String) -> URL?
}

extension NSWorkspace: MailAppWorkspaceOpening {}

/// Opens Apple Mail through Launch Services.
///
/// The Extensions pane is addressed with Mail's `mail-pref-pane` URL scheme,
/// which needs no additional permissions; a Mail version without the scheme
/// falls back to a plain launch, where the user reaches the pane manually.
final class MailAppOpenerImpl: MailAppOpening {
    private enum Constants {
        static let mailBundleIdentifier = "com.apple.mail"

        /// Mail's own URL scheme for its settings panes. The host is the
        /// preferences tab identifier, not a bundle identifier.
        static let extensionsPaneURL = URL(string: "mail-pref-pane://extensionspref")
    }

    private let workspace: MailAppWorkspaceOpening

    init(workspace: MailAppWorkspaceOpening = NSWorkspace.shared) {
        self.workspace = workspace
    }

    func openAppleMail() {
        guard let url = self.workspace.urlForApplication(
            withBundleIdentifier: Constants.mailBundleIdentifier
        ) else {
            LogError("Apple Mail application not found")
            return
        }

        if !self.workspace.open(url) {
            LogError("Failed to open Apple Mail")
        }
    }

    func openMailExtensionSettings() {
        if let url = Constants.extensionsPaneURL, self.workspace.open(url) {
            return
        }

        LogWarn("Mail extension pane URL is not handled, opening Apple Mail instead")
        self.openAppleMail()
    }
}
