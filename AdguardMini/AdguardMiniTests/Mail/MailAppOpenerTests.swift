// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailAppOpenerTests.swift
//  AdguardMiniTests
//

import XCTest

/// Verifies which URL the opener hands to the workspace: the plain Mail
/// application for "Open Apple Mail", Mail's extensions pane for "Open
/// Extensions", and the application fallback when the pane URL is unhandled.
final class MailAppOpenerTests: XCTestCase {
    /// Controllable stand-in for the workspace calls.
    private final class FakeWorkspace: MailAppWorkspaceOpening {
        private(set) var openedURLs: [URL] = []
        var openResult = true
        var mailAppURL: URL? = URL(fileURLWithPath: "/System/Applications/Mail.app")

        @discardableResult
        func open(_ url: URL) -> Bool {
            self.openedURLs.append(url)
            return self.openResult
        }

        func urlForApplication(withBundleIdentifier bundleIdentifier: String) -> URL? {
            self.mailAppURL
        }
    }

    func testOpenAppleMailOpensTheMailApplication() {
        let workspace = FakeWorkspace()
        let opener = MailAppOpenerImpl(workspace: workspace)

        opener.openAppleMail()

        XCTAssertEqual(workspace.openedURLs, [workspace.mailAppURL])
    }

    func testOpenAppleMailWithoutMailApplicationDoesNotOpenAnything() {
        let workspace = FakeWorkspace()
        workspace.mailAppURL = nil
        let opener = MailAppOpenerImpl(workspace: workspace)

        opener.openAppleMail()

        XCTAssertTrue(workspace.openedURLs.isEmpty)
    }

    func testOpenMailExtensionSettingsOpensTheExtensionsPane() {
        let workspace = FakeWorkspace()
        let opener = MailAppOpenerImpl(workspace: workspace)

        opener.openMailExtensionSettings()

        XCTAssertEqual(workspace.openedURLs, [URL(string: "mail-pref-pane://extensionspref")!])
    }

    func testOpenMailExtensionSettingsFallsBackToTheMailApplication() {
        let workspace = FakeWorkspace()
        workspace.openResult = false
        let opener = MailAppOpenerImpl(workspace: workspace)

        opener.openMailExtensionSettings()

        XCTAssertEqual(workspace.openedURLs, [
            URL(string: "mail-pref-pane://extensionspref")!,
            workspace.mailAppURL!
        ])
    }
}
