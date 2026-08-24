// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewAppLocator.swift
//  AdguardMini
//
//

import ProtoSchema

// MARK: - WebViewAppsControllerDependent

/// Dependency surface for injecting `WebViewAppsController`.
protocol WebViewAppsControllerDependent: AnyObject {
    var webViewAppsController: WebViewAppsController! { get set }
}

// MARK: - WKWebViewAppLocator

/// File-private locator that holds WKWebView-specific singleton services.
private final class WKWebViewAppLocator {
    static let shared = WKWebViewAppLocator()

    /// WKWebView-specific theme service instance.
    lazy var themeService: ThemeService.ServiceType = ThemeServiceImpl()

    /// WKWebView-specific onboarding callback service instance.
    lazy var onboardingCallbackService: OnboardingCallbackService = OnboardingCallbackService()

    /// WKWebView-specific tray callback service instance.
    lazy var trayCallbackService: TrayCallbackService = TrayCallbackService()

    /// WKWebView-specific settings callback service instance.
    lazy var settingsCallbackService: SettingsCallbackService = SettingsCallbackService()

    /// WKWebView-specific account callback service instance.
    lazy var accountCallbackService: AccountCallbackService = AccountCallbackService()
    /// WKWebView-specific filters callback service instance.
    lazy var filtersCallbackService: FiltersCallbackService = FiltersCallbackService()
    /// WKWebView-specific user-rules callback service instance.
    lazy var userRulesCallbackService: UserRulesCallbackService = UserRulesCallbackService()
    /// Dedicated user-rules callback service for the user-rules EDITOR window.
    lazy var userRulesEditorCallbackService: UserRulesCallbackService = UserRulesCallbackService()
    /// Dedicated settings callback service for the user-rules EDITOR window.
    lazy var settingsEditorCallbackService: SettingsCallbackService = SettingsCallbackService()

    private init() {}
}

/// Typed resolver for `WKWebViewAppLocator` services.
enum WKWebViewAppResolver {
    /// Exposes locator singletons through typed static accessors.
    static var themeService: ThemeService.ServiceType {
        WKWebViewAppLocator.shared.themeService
    }

    static var onboardingCallbackService: OnboardingCallbackService {
        WKWebViewAppLocator.shared.onboardingCallbackService
    }

    static var trayCallbackService: TrayCallbackService {
        WKWebViewAppLocator.shared.trayCallbackService
    }

    static var settingsCallbackService: SettingsCallbackService {
        WKWebViewAppLocator.shared.settingsCallbackService
    }

    static var accountCallbackService: AccountCallbackService {
        WKWebViewAppLocator.shared.accountCallbackService
    }

    static var filtersCallbackService: FiltersCallbackService {
        WKWebViewAppLocator.shared.filtersCallbackService
    }

    static var userRulesCallbackService: UserRulesCallbackService {
        WKWebViewAppLocator.shared.userRulesCallbackService
    }

    static var userRulesEditorCallbackService: UserRulesCallbackService {
        WKWebViewAppLocator.shared.userRulesEditorCallbackService
    }

    static var settingsEditorCallbackService: SettingsCallbackService {
        WKWebViewAppLocator.shared.settingsEditorCallbackService
    }
}
