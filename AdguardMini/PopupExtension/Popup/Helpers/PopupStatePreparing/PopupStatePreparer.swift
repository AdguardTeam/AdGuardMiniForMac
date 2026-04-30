// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupStatePreparer.swift
//  PopupExtension
//

import SafariServices
import AML
import AGSEDesignSystem

// MARK: - ToolbarState

/// Potentially possible state of the toolbar.
/// Currently there are only two states: `on` ("page is filtered") and `off` ("page is not filtered").
private enum ToolbarState {
    case on
    case off

    /// Image for current state.
    var toolbarImage: NSImage {
        switch self {
        case .on:
            SEImage.Toolbar.nsToolbarOn
        case .off:
            SEImage.Toolbar.nsToolbarOff
        }
    }
}

// MARK: - PopupStatePreparer

/// An object that prepares data to determine the current state of the layout and popup icon.
protocol PopupStatePreparer {
    func prepareState(
        window: SFSafariWindow,
        tabStats: TabStats
    ) async -> PopupState
}

// MARK: - PopupStatePreparerImpl

final class PopupStatePreparerImpl: PopupStatePreparer {
    private let safariApi: SafariApiInteractor
    private let safariApp: SafariApp

    init(safariApi: SafariApiInteractor, safariApp: SafariApp) {
        self.safariApi = safariApi
        self.safariApp = safariApp
    }

    func prepareState(
        window: SFSafariWindow,
        tabStats: TabStats
    ) async -> PopupState {
        async let appStateResult = self.safariApi.appState()
        async let propertiesResult = self.safariApp.getPropertiesOfActivePage(in: window)

        let appState = try? await appStateResult
        LogInfo("appState: \(String(describing: appState))")

        if let logLevel = appState?.logLevel,
           let logLevel = LogLevel(rawValue: Int(logLevel)) {
            LogConfig.setLogLevelAsyncly(logLevel)
        }

        if let theme = appState?.theme,
           let theme = Theme(rawValue: Int(theme)) {
            await NSApplication.shared.setTheme(theme)
        }

        let isProtectionEnabled = appState?.isProtectionEnabled ?? false
        guard isProtectionEnabled else {
            return self.prepareState(
                toolbarState: .off,
                toolbarEnabled: true,
                "Protection is not enabled or api state is unknown"
            )
        }
        guard let properties = await propertiesResult else {
            return self.prepareState(
                isProtectionEnabled: isProtectionEnabled,
                isProtectionEnabledForCurrentUrl: true,
                toolbarState: .on,
                toolbarEnabled: true,
                "Can't get properties: some object is nil"
            )
        }
        guard let url = properties.url else {
            return self.prepareState(
                isProtectionEnabled: isProtectionEnabled,
                isProtectionEnabledForCurrentUrl: true,
                toolbarState: .on,
                toolbarEnabled: false,
                "Unknown scheme"
            )
        }

        let urlString = url.absoluteString
        let state = (try? await self.safariApi.getCurrentFilteringState(withUrl: urlString).isFilteringEnabled) ?? false
        return self.prepareState(
            isProtectionEnabled: isProtectionEnabled,
            currentUrl: url,
            isProtectionEnabledForCurrentUrl: state,
            toolbarState: state ? .on : .off,
            toolbarEnabled: true,
            "Got filtering state for http(s) scheme"
        )
    }

    private func prepareState(
        isProtectionEnabled: Bool = false,
        currentUrl: URL? = nil,
        isProtectionEnabledForCurrentUrl: Bool = false,
        toolbarState: ToolbarState,
        toolbarEnabled: Bool,
        _ dbgMsg: @autoclosure () -> String
    ) -> PopupState {
        LogDebug("\(dbgMsg()) -- state: \(toolbarState), result: \(toolbarEnabled)")
        return PopupState(
            popupIconState: PopupIconState(
                enabled: toolbarEnabled,
                toolbarImage: toolbarState.toolbarImage
            ),
            isProtectionEnabled: isProtectionEnabled,
            protectionForUrlState: ProtectionForUrlState(
                currentUrl: currentUrl,
                isProtectionEnabledForCurrentUrl: isProtectionEnabledForCurrentUrl
            )
        )
    }
}
