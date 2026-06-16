// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ExternalEventsAdapter.swift
//  PopupExtension
//

import Foundation
import SafariServices
import AML

// MARK: - RunningAppStreaming

/// Abstraction over `RunningAppStream` for testability.
protocol RunningAppStreaming: Sendable {
    func stream() -> AsyncStream<Bool>
}

/// Production implementation — delegates to `RunningAppStream`.
struct LiveRunningAppStream: RunningAppStreaming {
    func stream() -> AsyncStream<Bool> {
        RunningAppStream.stream(bundleId: BuildConfig.AG_APP_ID)
    }
}

// MARK: - ExternalEventsAdapter

/// Single subscription point for external push sources.
/// Converts each event into a `Store.Action` and dispatches
/// it to `PopupStore`. Conforms to `ExtensionSafariApiClientDelegate`
/// to receive XPC pushes from the main app. Also provides on-demand
/// tab stats dispatching via `refreshTabStats(stats:token:pageUrl:)`.
///
/// Lifecycle: `start()` begins all subscriptions; `stop()` cancels
/// them. Both are idempotent.
final class ExternalEventsAdapter: NSObject, @unchecked Sendable {
    private let store: PopupStore
    private let runningAppStream: RunningAppStreaming

    private let lock = UnfairLock()
    private var runningAppTask: Task<Void, Never>?

    init(
        store: PopupStore,
        runningAppStream: RunningAppStreaming = LiveRunningAppStream()
    ) {
        self.store = store
        self.runningAppStream = runningAppStream
    }

    // MARK: - Lifecycle

    func start() {
        locked(self.lock) {
            guard runningAppTask == nil else { return }
            let stream = self.runningAppStream.stream()
            self.runningAppTask = Task { [weak self] in
                for await isRunning in stream {
                    guard let self, !Task.isCancelled else { return }
                    await self.store.dispatch(.mainAppRunningChanged(isRunning))
                }
            }
        }
    }

    func stop() {
        let task = locked(self.lock) {
            let current = self.runningAppTask
            self.runningAppTask = nil
            return current
        }
        task?.cancel()
    }

    // MARK: - On-demand polling

    /// Dispatches tab stats and the resolved tab context to the store.
    /// Called by the toolbar validation entrypoint
    /// (`SafariExtensionHandler.validateToolbarItem`) after all
    /// `SFSafariWindow`-dependent work has been completed.
    func refreshTabStats(
        stats: TabStats,
        token: Store.SafariWindowToken,
        pageUrl: URL?
    ) async {
        let isSystemPage = pageUrl?.host == nil && pageUrl?.scheme == nil
        let domain = pageUrl?.host ?? pageUrl.map { "\($0.scheme ?? "")://" } ?? ""
        let tabContext = Store.TabContext(
            windowToken: token,
            url: pageUrl,
            domain: domain,
            isSystemPage: isSystemPage
        )
        await self.store.dispatch(.tabContextUpdated(stats: stats, context: tabContext))
    }
}

// MARK: - ExtensionSafariApiClientDelegate

extension ExternalEventsAdapter: ExtensionSafariApiClientDelegate {
    func appStateChanged(_ appState: EBAAppState) {
        // Read fields immediately — EBAAppState is a reference type
        // (may be mutated after this call returns).
        let snapshot = Store.AppStateSnapshot(
            isProtectionEnabled: appState.isProtectionEnabled,
            lastCheckTime: appState.lastCheckTime,
            logLevel: appState.logLevel,
            theme: appState.theme,
            isFreeUser: appState.isFreeUser,
            isTrialAvailable: appState.isTrialAvailable,
            trialDays: appState.trialDays
        )
        Task {
            await self.store.dispatch(.appStateChanged(snapshot))
        }
    }

    func setLogLevel(_ logLevel: LogLevel) {
        Task {
            await self.store.dispatch(.logLevelChanged(logLevel))
        }
    }

    func setTheme(_ theme: Theme) {
        Task {
            await self.store.dispatch(.themeChanged(theme))
        }
    }
}
