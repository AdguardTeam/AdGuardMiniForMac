// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TelemetryTestTypes.swift
//  AdguardMiniTests
//

/// Test-target `Telemetry` type definitions shared across modules.
enum Telemetry {
    enum Screen: String {
        case main = "safari_popup_main"
        case protectionDisabled = "safari_popup_protection_disabled"
        case healthCheckAttention = "safari_popup_health_check_attention"
        case failedEnableProtection = "safari_popup_failed_enable_protection"
    }

    enum Action: String {
        case pauseProtectionPopupClick = "pause_protection_popup_click"
        case settingPopupClick         = "setting_popup_click"
        case protectionPopupClick      = "protection_popup_click"
        case blockElementPopupClick    = "block_element_popup_click"
        case reportIssueClick          = "report_issue_click"
        case rateMiniPopupClick        = "rate_mini_popup_click"
        case fixItPopupClick           = "fix_it_popup_click"
    }

    enum Event: Equatable {
        /// PopupExtension page view event.
        case pageView(_ screen: Screen)
        /// PopupExtension action event.
        case action(_ action: Action, screen: Screen)
        /// Main app page view event.
        case pageview(Pageview)
        /// Main app custom event.
        case customEvent(CustomEvent)
    }

    struct Pageview: Equatable {
        /// Page name.
        let name: String
        /// Optional referrer page.
        let refName: String?

        init(name: String, refName: String? = nil) {
            self.name = name
            self.refName = refName
        }
    }

    struct CustomEvent: Equatable {
        /// Custom event name.
        let name: String
        /// Page where event occurred.
        let refName: String
        let action: String?
        let label: String?

        init(name: String, refName: String, action: String? = nil, label: String? = nil) {
            self.name = name
            self.refName = refName
            self.action = action
            self.label = label
        }
    }
}
