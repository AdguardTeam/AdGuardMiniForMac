// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  EffectRunner.swift
//  PopupExtension
//

import Foundation
import SafariServices
import AppKit
import AML

// MARK: - CancellationCategory

/// Groups effects that should cancel a previously running effect of
/// the same category. Effects not listed here run fire-and-forget
/// and are never individually cancelled.
private enum CancellationCategory: Hashable {
    case protectionStatus
    case filteringStatus
    case appStateRefresh
    case prereqsRefresh
    case launch
    case restart
    case safariSettings
    case settings
    case purchase
    case report
    case healthCheck
    case preparePopup
}

private extension Store.Effect {
    var cancellationCategory: CancellationCategory? {
        switch self {
        case .setProtectionStatus:      .protectionStatus
        case .setFilteringStatusForUrl: .filteringStatus
        case .refreshAppState:          .appStateRefresh
        case .refreshPrereqs:           .prereqsRefresh
        case .launchMainApp:            .launch
        case .restartMainApp:           .restart
        case .openSafariSettings:       .safariSettings
        case .openSettings:             .settings
        case .openPurchase:             .purchase
        case .reportSite:               .report
        case .refreshHealthCheck:       .healthCheck
        case .preparePopup:             .preparePopup
        case .openUrlInNewTab,
             .openUrlWithSystemHandler,
             .requestToolbarUpdate,
             .dispatchPageScriptMessage,
             .sendTelemetry,
             .setLogLevel,
             .setAppTheme,
             .dismissPopover,
             .notifyWindowOpened:       nil
        }
    }
}

// MARK: - EffectRunner

final class EffectRunner: EffectRunning, @unchecked Sendable {
    // Dependencies — all protocols, injected at init.
    private let safariApi: SafariApiInteractor
    private let mainAppDiscovery: MainAppDiscovery
    private let safariApp: SafariApp
    private let dismissPopover: @Sendable @MainActor () -> Void

    // Cancellation bookkeeping — guarded by AML's UnfairLock.
    private let lock = UnfairLock()
    private var runningTasks: [CancellationCategory: Task<Void, Never>] = [:]

    init(
        safariApi: SafariApiInteractor,
        mainAppDiscovery: MainAppDiscovery,
        safariApp: SafariApp,
        dismissPopover: @escaping @Sendable @MainActor () -> Void
    ) {
        self.safariApi = safariApi
        self.mainAppDiscovery = mainAppDiscovery
        self.safariApp = safariApp
        self.dismissPopover = dismissPopover
    }

    func run(_ effect: Store.Effect) async -> Store.Action? {
        // Fire-and-forget effects (no completion action).
        switch effect {
        case .requestToolbarUpdate:
            self.safariApp.setToolbarItemsNeedUpdate()
            return nil

        case let .dispatchPageScriptMessage(name):
            if let page = await self.safariApp.getActivePage() {
                page.dispatchMessageToScript(withName: name)
                return .blockElementCompleted(pageFound: true)
            }
            return .blockElementCompleted(pageFound: false)

        case let .sendTelemetry(event):
            await self.sendTelemetry(event)
            return nil

        case let .setLogLevel(level):
            LogConfig.setLogLevelAsyncly(level)
            return nil

        case let .setAppTheme(theme):
            await NSApplication.shared.setTheme(theme)
            return nil

        case .dismissPopover:
            await self.dismissPopover()
            return nil

        case let .openUrlInNewTab(url):
            await self.safariApp.openUrlInNewTab(url)
            return nil

        case .notifyWindowOpened:
            try? await self.safariApi.notifyWindowOpened()
            return nil

        default:
            break
        }

        // Cancellable effects that produce completion actions.
        return await runCancellable(effect)
    }

    func cancelAll() {
        let tasks = locked(self.lock) {
            let captured = Array(self.runningTasks.values)
            self.runningTasks.removeAll()
            return captured
        }
        tasks.forEach { $0.cancel() }
    }

    func registerTask(_ task: Task<Void, Never>, for effect: Store.Effect) {
        guard let category = effect.cancellationCategory else { return }
        let previous = locked(self.lock) {
            let prev = self.runningTasks[category]
            self.runningTasks[category] = task
            return prev
        }
        previous?.cancel()
    }

    // MARK: - Private

    private func runCancellable(_ effect: Store.Effect) async -> Store.Action? {
        let result = await self.execute(effect)

        // If we were cancelled during execution, suppress the action.
        guard !Task.isCancelled else { return nil }

        return result
    }

    // Dispatch table; cyclomatic complexity is structural (each branch is a single dispatch).
    // swiftlint:disable:next cyclomatic_complexity
    private func execute(_ effect: Store.Effect) async -> Store.Action? {
        switch effect {
        case let .setProtectionStatus(enable):
            return await self.executeSetProtectionStatus(enable)
        case let .setFilteringStatusForUrl(url, enable):
            return await self.executeSetFilteringStatus(url: url, enable: enable)
        case let .refreshAppState(after):
            return await self.executeRefreshAppState(after: after)
        case let .refreshPrereqs(_, tabUrl):
            return await self.executeRefreshPrereqs(tabUrl: tabUrl)
        case .launchMainApp:
            self.mainAppDiscovery.runMainApplication()
            return .launchMainAppCompleted(nil)
        case .restartMainApp:
            return await self.executeRestartMainApp()
        case .openSafariSettings:
            return await self.executeOpenSafariSettings()
        case let .openSettings(page):
            return await self.executeOpenSettings(page: page)
        case .openPurchase:
            return await self.executeOpenPurchase()
        case let .reportSite(url):
            return await self.executeReportSite(url: url)
        case .refreshHealthCheck:
            return await self.executeRefreshHealthCheck()
        case .preparePopup:
            return await self.executePreparePopup()
        case let .openUrlWithSystemHandler(url):
            NSWorkspace.shared.open(url)
            return nil
        case .openUrlInNewTab, .requestToolbarUpdate,
             .dispatchPageScriptMessage, .sendTelemetry,
             .setLogLevel, .setAppTheme, .dismissPopover,
             .notifyWindowOpened:
            return nil
        }
    }

    private func executeSetProtectionStatus(_ enable: Bool) async -> Store.Action {
        do {
            let timestamp = try await self.safariApi.setProtectionStatus(enable)
            return .setProtectionStatusCompleted(.success(timestamp))
        } catch {
            return .setProtectionStatusCompleted(
                .failure(.protectionToggleFailed(domain: nil))
            )
        }
    }

    private func executeSetFilteringStatus(url: String, enable: Bool) async -> Store.Action {
        do {
            let timestamp = try await self.safariApi.setFilteringStatusWithUrl(
                url, isEnabled: enable
            )
            return .setFilteringStatusCompleted(.success(timestamp))
        } catch {
            return .setFilteringStatusCompleted(
                .failure(.filteringStateFetchFailed)
            )
        }
    }

    private func executeRefreshAppState(after: EBATimestamp?) async -> Store.Action? {
        do {
            let appState: EBAAppState
            if let after {
                appState = try await self.safariApi.appState(after: after)
            } else {
                appState = try await self.safariApi.appState()
            }
            return .appStateChanged(Store.AppStateSnapshot(
                isProtectionEnabled: appState.isProtectionEnabled,
                lastCheckTime: appState.lastCheckTime,
                logLevel: appState.logLevel,
                theme: appState.theme,
                isFreeUser: appState.isFreeUser,
                isTrialAvailable: appState.isTrialAvailable,
                trialDays: appState.trialDays
            ))
        } catch {
            let isXpcUnavailable = (error as? ExtensionSafariApiClientErrorCode) == .linkTimeout
            return .appStateRefreshSkipped(isXpcUnavailable: isXpcUnavailable)
        }
    }

    private func executeRefreshPrereqs(tabUrl: String) async -> Store.Action? {
        do {
            let onboardingCompleted = try await self.safariApi.isOnboardingCompleted()

            let isFilteringEnabled: Bool
            if tabUrl.isEmpty {
                isFilteringEnabled = true
            } else {
                isFilteringEnabled = try await self.safariApi
                    .getCurrentFilteringState(withUrl: tabUrl).isFilteringEnabled
            }

            return .prereqsRefreshed(
                onboardingCompleted: onboardingCompleted,
                tabUrl: tabUrl,
                isFilteringEnabled: isFilteringEnabled
            )
        } catch {
            let isXpcUnavailable = (error as? ExtensionSafariApiClientErrorCode) == .linkTimeout
            return .prereqsRefreshSkipped(isXpcUnavailable: isXpcUnavailable)
        }
    }

    private func executeRefreshHealthCheck() async -> Store.Action? {
        do {
            let hasAttention = try await self.safariApi.hasHealthCheckAttention()
            return .healthCheckRefreshed(hasAttention: hasAttention)
        } catch {
            return nil
        }
    }

    /// Fetches health-check status and returns `.popupReady`,
    /// guaranteeing an action even on XPC failure (defaults to `false`).
    private func executePreparePopup() async -> Store.Action? {
        let hasAttention = (try? await self.safariApi.hasHealthCheckAttention()) ?? false
        return .popupReady(hasHealthCheckAttention: hasAttention)
    }

    private func executeRestartMainApp() async -> Store.Action {
        do {
            try await self.mainAppDiscovery.restartMainApplication()
            return .restartMainAppCompleted(nil)
        } catch {
            return .restartMainAppCompleted(.restartFailed)
        }
    }

    private func executeOpenSafariSettings() async -> Store.Action {
        do {
            try await self.safariApi.openSafariSettings()
            return .openSafariSettingsCompleted(nil)
        } catch {
            return .openSafariSettingsCompleted(.openSafariSettingsFailed)
        }
    }

    private func executeOpenSettings(page: String?) async -> Store.Action {
        do {
            try await self.mainAppDiscovery.openSettings(page: page)
            return .openSettingsCompleted(nil)
        } catch {
            return .openSettingsCompleted(.openSettingsFailed)
        }
    }

    private func executeOpenPurchase() async -> Store.Action? {
        do {
            try await self.mainAppDiscovery.openPurchase()
        } catch {
            LogDebug("Failed to open purchase screen: \(error)")
        }
        return nil
    }

    private func executeReportSite(url: String) async -> Store.Action {
        do {
            let reportUrlString = try await self.safariApi.reportSite(with: url)
            guard let reportUrl = URL(string: reportUrlString) else {
                return .reportSiteCompleted(.failure(.reportFailed))
            }
            return .reportSiteCompleted(.success(reportUrl))
        } catch {
            return .reportSiteCompleted(.failure(.reportFailed))
        }
    }

    private func sendTelemetry(_ event: Telemetry.Event) async {
        do {
            switch event {
            case let .pageView(screen):
                try await self.safariApi.telemetryPageViewEvent(screen)
            case let .action(action, screen):
                try await self.safariApi.telemetryActionEvent(
                    action, screen: screen
                )
            }
        } catch {
            LogDebug("Can't send telemetry event: \(error)")
        }
    }
}
