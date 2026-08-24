// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ModuleCapabilities.swift
//  AdguardMini
//

import Foundation

/**
 * Declares module capabilities for review.
 */
enum ModuleCapabilities {
    // MARK: - Constants

    /// Channel name literals.
    private enum Constants {
        static let rpc = "rpc"
        static let openLinkInBrowser = "openLinkInBrowser"
        static let systemClipboard = "systemClipboard"
        static let rpcTimeoutAlert = "rpcTimeoutAlert"
        static let jsRuntimeError = "jsRuntimeError"
        static let jsLog = "jsLog"
    }

    /// Shared message handler channels.
    static let sharedMessageHandlers: [String] = [
        Constants.rpc,
        Constants.openLinkInBrowser,
        Constants.systemClipboard,
        Constants.rpcTimeoutAlert,
        Constants.jsRuntimeError,
        Constants.jsLog
    ]

    /// Shared delegate assignments.
    static let sharedDelegateAssignments: [String] = [
        "webView.uiDelegate = InterfaceRequestDenier",
        "webView.navigationDelegate = host",
        "window.delegate = host"
    ]

    /// Module-specific message handlers.
    static func extraMessageHandlers(for module: ModuleId) -> [String] {
        switch module {
        case .settings, .tray, .onboarding, .userrules:
            return []
        }
    }

    /// All message handlers for module.
    static func messageHandlers(for module: ModuleId) -> [String] {
        sharedMessageHandlers + extraMessageHandlers(for: module)
    }

    /// Bridge services for module.
    static func bridgeServices(for module: ModuleId) -> [String] {
        switch module {
        case .tray:
            return [
                "ThemeService", "TraySettingsService", "AccountService",
                "SafariExtensionsService", "AdvancedBlockingService",
                "AppUpdateService", "TelemetryService", "InternalService",
                "SystemService", "ConsentService", "FiltersService"
            ]
        case .settings:
            return [
                "ThemeService", "AccountService", "SafariExtensionsService",
                "AdvancedBlockingService", "AppUpdateService",
                "SettingsService", "FiltersService", "AppInfoService",
                "UserRulesService", "InternalService", "SystemService",
                "ConsentService", "TelemetryService"
            ]
        case .onboarding:
            return [
                "ThemeService", "OnboardingService", "ConsentService",
                "SafariExtensionsService", "FiltersService",
                "AppUpdateService", "TelemetryService", "InternalService"
            ]
        case .userrules:
            return [
                "ThemeService", "UserRulesService", "InternalService",
                "TelemetryService"
            ]
        }
    }

    /// Callback attachments for module.
    static func callbackAttachments(for module: ModuleId) -> [String] {
        switch module {
        case .tray:
            return ["trayCallbackService"]
        case .settings:
            return [
                "settingsCallbackService", "userRulesCallbackService",
                "accountCallbackService", "filtersCallbackService"
            ]
        case .onboarding:
            return ["onboardingCallbackService"]
        case .userrules:
            return ["userRulesEditorCallbackService", "settingsEditorCallbackService"]
        }
    }

    /// Allowed InternalService methods.
    static func internalServiceMethods(for module: ModuleId) -> Set<String> {
        switch module {
        case .settings:
            // Least-privilege: only the methods the settings renderer actually
            // Invokes. `OpenSettingsWindow` is tray-only and
            // `CloseUserRulesWindow`/`GetSystemLanguage` run on the separate
            // `.userrules` child host (which has its own set below).
            return [
                "OpenUserRulesWindow", "ShowInFinder", "reportAnIssue"
            ]
        case .tray:
            return ["OpenSettingsWindow"]
        case .onboarding:
            return []
        case .userrules:
            return ["CloseUserRulesWindow", "GetSystemLanguage", "reportAnIssue"]
        }
    }
}
