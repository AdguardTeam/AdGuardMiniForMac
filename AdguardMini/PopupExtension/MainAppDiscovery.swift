// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MainAppDiscovery.swift
//  EntryExtension
//

import AppKit
import AML

// MARK: Errors

enum MainAppDiscoveryError: Error {
    case mainAppNotFounded
}

// MARK: - MainAppDiscovery

protocol MainAppDiscovery {
    func checkMainAppIsRunning() -> Bool
    func runMainApplication()
    func restartMainApplication() async throws
    func openSettings(page: String?) async throws
    func openPurchase() async throws
    func subscribeCustomFilter(_ url: String) async throws
}

// MARK: - MainAppDiscoveryImpl

final class MainAppDiscoveryImpl: MainAppDiscovery {
    func checkMainAppIsRunning() -> Bool {
        !NSRunningApplication.runningApplications(withBundleIdentifier: BuildConfig.AG_APP_ID).isEmpty
    }

    func runMainApplication() {
        guard let appUrl = NSWorkspace.shared
            .urlForApplication(
                withBundleIdentifier: BuildConfig.AG_APP_ID
            )
        else { return }

        NSWorkspace.shared.openApplication(at: appUrl, configuration: .silent)
    }

    func restartMainApplication() async throws {
        let actionRestartUrl = InternalUrlSchemeActionUrl.restart.url
        try await self.openUrl(actionRestartUrl, configuration: .silent)
    }

    func openSettings(page: String?) async throws {
        let actionUrl = InternalUrlSchemeActionUrl.openSettings(page: page).url
        try await self.openUrl(actionUrl)
    }

    func openPurchase() async throws {
        let actionUrl = InternalUrlSchemeActionUrl.openPurchase.url
        try await self.openUrl(actionUrl)
    }

    func subscribeCustomFilter(_ url: String) async throws {
        guard var components = URLComponents(
            url: InternalUrlSchemeActionUrl.subscribeFilter.url,
            resolvingAgainstBaseURL: true
        ) else {
            LogDebug("Failed to create URLComponents from predefined url: \(url)")
            return
        }
        components.queryItems = [URLQueryItem(name: InternalUrlSchemeActionUrl.SubscribeFilterParam.url, value: url)]
        guard let urlToOpen = components.url else {
            LogError("Failed to create url from components: \(components)")
            return
        }
        try await self.openUrl(urlToOpen)
    }

    private func openUrl(
        _ actionUrl: URL,
        configuration: NSWorkspace.OpenConfiguration = .foreground
    ) async throws {
        guard let appUrl = NSWorkspace.shared.urlForApplication(toOpen: actionUrl) else {
            throw MainAppDiscoveryError.mainAppNotFounded
        }

        try await NSWorkspace.shared.open(
            [actionUrl],
            withApplicationAt: appUrl,
            configuration: configuration
        )
    }
}
