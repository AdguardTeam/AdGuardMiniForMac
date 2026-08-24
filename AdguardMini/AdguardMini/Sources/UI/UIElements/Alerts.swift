// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Alerts.swift
//  AdguardMini
//

import AppKit
import AML

// MARK: - Alerts

extension AppAlert {
    /// Configured alert that appears when app needs to reset.
    ///
    /// Buttons:
    /// - First button is for **"Close"**.
    /// - Second button is for **"Reset"**.
    static func resetRequest() async -> AppAlert {
        await createAlert(
            firstButtonText:  .localized.base.close_button,
            secondButtonText: .localized.base.reset_setting_button,
            messageText:      .localized.base.reset_settings_message,
            informativeText:  .localized.base.reseting_settings_request
        )
    }

    /// Configured alert that appears when app needs to restart.
    ///
    /// Buttons:
    /// - First button is for **"Restart"**.
    /// - Second button is for **"Quit"**.
    static func restartRequest() async -> AppAlert {
        await self.createAlert(
            firstButtonText:  .localized.base.restart_button,
            secondButtonText: .localized.base.restarting_request_quit,
            messageText:      .localized.base.restarting_request_message_title,
            informativeText:  .localized.base.restarting_request_message_text
        )
    }

    /// Configured alert that appears when a WKWebView cannot load its
    /// entry.
    ///
    /// Buttons:
    /// - First button is for **"Report issue"**.
    /// - Second button is for **"Restart"**.
    static func webViewLoadFailureRequest(
        moduleName: String,
        errorMessage: String
    ) async -> AppAlert {
        await createAlert(
            firstButtonText:  .localized.base.report_issue_button,
            secondButtonText: .localized.base.restart_button,
            messageText:      .localized.base.webview_load_failure_message_title,
            informativeText:  "\(String.localized.base.webview_load_failure_message_text) [module=\(moduleName), error=\(Self.sanitized(errorMessage))]"
        )
    }

    /// Collapses whitespace/newlines and bounds an unbounded error string so
    /// it cannot garble the alert layout.
    private static func sanitized(_ errorMessage: String) -> String {
        let singleLine = errorMessage
            .replacingOccurrences(of: "\n", with: " ")
            .replacingOccurrences(of: "\r", with: " ")
        let trimmed = singleLine.trimmingCharacters(in: .whitespacesAndNewlines)
        let maxErrorLength = 200
        guard trimmed.count > maxErrorLength else {
            return trimmed
        }
        return String(trimmed.prefix(maxErrorLength)) + "…"
    }

    /// Configured alert that appears when user tries to quit an app.
    ///
    /// Buttons:
    /// - First button is for **"Yes, keep running background"**.
    /// - Second button is for **"No, quit app"**.
    static func quitApp() async -> AppAlert {
        await self.createAlert(
            firstButtonText:     .localized.base.terminate_app_alert_button_title_run_in_background,
            secondButtonText:    .localized.base.terminate_app_alert_button_title_quit,
            messageText:         .localized.base.terminate_app_alert_message_text,
            informativeText:     .localized.base.terminate_app_alert_informative_text,
            alertStyle:          .warning,
            supressButtonConfig: .init(
                title:      .localized.base.terminate_app_alert_suppression_button_title,
                shouldShow: UserSettings().quitReaction == .ask
            )
        )
    }
}

// MARK: - AppAlert

class AppAlert: NSAlert {
    @MainActor
    func show() async -> NSApplication.ModalResponse {
        await UIUtils.windowWillBeVisible(self)
        let response = super.runModal()
        UIUtils.removeWindow(self)
        return response
    }

    @available(*, unavailable)
    override func runModal() -> NSApplication.ModalResponse {
        LogError("Unexpected call to runModal on AppAlert")
        assertionFailure("RunModal on AppAlert is unavailable")
        return super.runModal()
    }
}

private extension AppAlert {
    struct SupressButtonConfig {
        let title: String
        let shouldShow: Bool
    }

    @MainActor
    static func createAlert(
        firstButtonText: String,
        secondButtonText: String,
        messageText: String,
        informativeText: String,
        alertStyle: NSAlert.Style = .critical,
        supressButtonConfig: SupressButtonConfig? = nil
    ) async -> AppAlert {
        let alert = AppAlert()
        alert.addButton(withTitle: firstButtonText).keyEquivalent = "\r"
        alert.addButton(withTitle: secondButtonText)
        alert.alertStyle = .critical
        alert.messageText = messageText
        alert.informativeText = informativeText
        if let config = supressButtonConfig {
            alert.showsSuppressionButton = config.shouldShow
            alert.suppressionButton?.title = config.title
        }
        return alert
    }
}
