// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterService.swift
//  AdguardMini
//

import Foundation
import NetworkExtension
import AML

// MARK: - Constants

private enum Constants {
    static let maxRetryAttempts = 3
    static let baseRetryDelaySeconds: TimeInterval = 1
}

// MARK: - URLFilterService

/// Manages the `NEURLFilterManager` configuration and lifecycle and publishes
/// status/configuration changes on ``EventBus``.
///
/// On macOS 26+ the live implementation (``URLFilterServiceLiveImpl``) is used.
/// On older systems the no-op implementation (``URLFilterServiceNoOp``) is injected:
/// every throwing method throws ``URLFilterServiceError/unsupportedPlatform``
/// and ``getStatus()`` returns ``URLFilterStatus/disabled``.
protocol URLFilterService: AnyObject {
    /// Begins observing status and configuration changes.
    func start() async
    /// Loads the current configuration from `NEURLFilterManager`.
    /// - Returns: The current configuration, or `nil` if not configured.
    func loadConfiguration() async throws -> URLFilterConfiguration?
    /// Saves the given configuration and publishes `urlFilterConfigurationChanged`.
    func save(configuration: URLFilterConfiguration) async throws
    /// Removes the configuration from System Settings and publishes
    /// `urlFilterConfigurationChanged`.
    func removeConfiguration() async throws
    /// Enables or disables the filter and refreshes PIR parameters so it (re)starts.
    func setEnabled(_ enabled: Bool) async throws
    /// Returns the current derived filter status.
    func getStatus() async -> URLFilterStatus
    /// Triggers a prefilter refresh by calling `NEURLFilterManager.refreshPIRParameters()`.
    /// - Throws: ``URLFilterServiceError/resetCacheFailed`` on macOS 26+, ``URLFilterServiceError/unsupportedPlatform`` on macOS < 26.
    func resetCache() async throws
}

// MARK: - URLFilterServiceLiveImpl

/// Live ``URLFilterService`` implementation backed by `NEURLFilterManager`.
///
/// Implemented as an `actor` to serialize manager access and guarantee ordered
/// ``EventBus`` posts. Only available on macOS 26+.
@available(macOS 26, *)
final actor URLFilterServiceLiveImpl: URLFilterService {
    private let eventBus: EventBus
    private let sharedKeychainStorage: SharedKeychainStorage
    private var statusObservationTask: Task<Void, Never>?
    private var configObservationTask: Task<Void, Never>?
    private var paidStatusTask: Task<Void, Never>?

    init(
        eventBus: EventBus,
        sharedKeychainStorage: SharedKeychainStorage
    ) {
        self.eventBus = eventBus
        self.sharedKeychainStorage = sharedKeychainStorage
    }

    deinit {
        self.statusObservationTask?.cancel()
        self.configObservationTask?.cancel()
        self.paidStatusTask?.cancel()
    }

    func start() async {
        let status = await self.currentStatus()
        LogInfo("URLFilter service started, current status: \(status)")
        self.startObserving()
        self.startObservingPaidStatus()
    }

    func loadConfiguration() async throws -> URLFilterConfiguration? {
        let manager = NEURLFilterManager.shared
        do {
            try await manager.loadFromPreferences()
        } catch {
            throw URLFilterServiceError.loadFailed(error)
        }
        // A valid configuration must have at least a server URL set.
        guard manager.pirServerURL != nil else { return nil }
        let protectionLevel = self.sharedKeychainStorage.urlFilterProtectionLevel
        return URLFilterConfiguration(
            protectionLevel: protectionLevel,
            prefilterFetchInterval: manager.prefilterFetchInterval,
            shouldFailClosed: manager.shouldFailClosed,
            enabled: manager.isEnabled
        )
    }

    func save(configuration: URLFilterConfiguration) async throws {
        let manager = NEURLFilterManager.shared
        do {
            try await manager.loadFromPreferences()
        } catch {
            throw URLFilterServiceError.loadFailed(error)
        }
        // Select the correct token, server URL, and issuer URL for the chosen
        // Protection level. The level configuration is compiled into the app.
        guard let levelConfig = URLFilterLevelConfiguration.defaultLevels[
            configuration.protectionLevel
        ] else {
            throw URLFilterServiceError.configurationMissing
        }
        try manager.setConfiguration(
            pirServerURL: levelConfig.pirServerURL,
            pirPrivacyPassIssuerURL: levelConfig.pirPrivacyPassIssuerURL,
            pirAuthenticationToken: levelConfig.pirAuthenticationToken,
            controlProviderBundleIdentifier: BuildConfig.AG_NETWORK_EXTENSION_BUNDLEID
        )
        manager.prefilterFetchInterval = configuration.prefilterFetchInterval
        manager.shouldFailClosed = configuration.shouldFailClosed
        manager.isEnabled = configuration.enabled
        do {
            try await manager.saveToPreferences()
        } catch NEURLFilterManager.Error.configurationUnchanged {
            // Nothing changed: treat as success and skip the spurious change event.
            return
        } catch {
            throw URLFilterServiceError.saveFailed(error)
        }
        // Persist the protection level so the network extension can read it.
        self.sharedKeychainStorage.urlFilterProtectionLevel =
            configuration.protectionLevel
        LogInfo(
            "URLFilter configuration saved: level=\(configuration.protectionLevel), "
                + "server=\(levelConfig.pirServerURL), enabled=\(configuration.enabled)"
        )
        self.eventBus.post(event: .urlFilterConfigurationChanged, userInfo: configuration)
    }

    func removeConfiguration() async throws {
        do {
            try await NEURLFilterManager.shared.removeFromPreferences()
        } catch {
            throw URLFilterServiceError.removeFailed(error)
        }
        LogInfo("URLFilter configuration removed")
        self.eventBus.post(event: .urlFilterConfigurationChanged, userInfo: nil)
    }

    func setEnabled(_ enabled: Bool) async throws {
        var baseDelay = Constants.baseRetryDelaySeconds

        for attempt in 1...Constants.maxRetryAttempts {
            do {
                try await self.setEnabledOnce(enabled)
                LogInfo("URLFilter setEnabled(\(enabled)) succeeded on attempt \(attempt)")
                return
            } catch {
                if attempt < Constants.maxRetryAttempts {
                    LogWarn(
                        "URLFilter setEnabled(\(enabled)) failed on attempt \(attempt) "
                            + "(retrying in \(baseDelay)s): \(error)"
                    )
                    try await Task.sleep(seconds: baseDelay)
                    baseDelay *= 2
                } else {
                    LogError(
                        "URLFilter setEnabled(\(enabled)) failed after "
                            + "\(Constants.maxRetryAttempts) attempts: \(error)"
                    )
                    throw error
                }
            }
        }
    }

    private func setEnabledOnce(_ enabled: Bool) async throws {
        let manager = NEURLFilterManager.shared
        do {
            try await manager.loadFromPreferences()
        } catch {
            throw URLFilterServiceError.loadFailed(error)
        }
        guard manager.pirServerURL != nil else { throw URLFilterServiceError.configurationMissing }
        manager.isEnabled = enabled
        do {
            try await manager.saveToPreferences()
        } catch NEURLFilterManager.Error.configurationUnchanged {
            // The enabled flag already matched; continue to refresh so the filter reflects state.
        } catch {
            throw URLFilterServiceError.setEnabledFailed(error)
        }
        do {
            try await manager.refreshPIRParameters()
        } catch {
            throw URLFilterServiceError.setEnabledFailed(error)
        }
    }

    func getStatus() async -> URLFilterStatus {
        await self.currentStatus()
    }

    func resetCache() async throws {
        let manager = NEURLFilterManager.shared
        do {
            try await manager.refreshPIRParameters()
            LogInfo("URLFilter prefilter cache reset triggered successfully")
        } catch {
            LogError("URLFilter prefilter cache reset failed: \(error)")
            throw URLFilterServiceError.resetCacheFailed(error)
        }
    }

    // MARK: - Private

    private func startObserving() {
        self.statusObservationTask?.cancel()
        self.statusObservationTask = Task { [weak self] in
            for await _ in NEURLFilterManager.shared.handleStatusChange() {
                await self?.publishStatusChange()
            }
        }
        self.configObservationTask?.cancel()
        self.configObservationTask = Task { [weak self] in
            for await _ in NEURLFilterManager.shared.handleConfigChange() {
                await self?.publishConfigurationChange()
            }
        }
    }

    private func publishStatusChange() async {
        let status = await self.currentStatus()
        LogInfo("URLFilter status changed: \(status)")
        self.syncEnabledFromStatus(status)
        self.eventBus.post(event: .urlFilterStatusChanged, userInfo: status)
    }

    private func publishConfigurationChange() async {
        let manager = NEURLFilterManager.shared
        try? await manager.loadFromPreferences()

        guard manager.pirServerURL != nil else {
            // Configuration was removed from System Settings
            self.sharedKeychainStorage.urlFilterEnabled = false
            LogInfo("URLFilter enabled state updated to false (configuration removed)")
            self.eventBus.post(event: .urlFilterConfigurationChanged, userInfo: nil)
            return
        }

        // Configuration was changed (not removed)
        let protectionLevel = self.sharedKeychainStorage.urlFilterProtectionLevel
        let config = URLFilterConfiguration(
            protectionLevel: protectionLevel,
            prefilterFetchInterval: manager.prefilterFetchInterval,
            shouldFailClosed: manager.shouldFailClosed,
            enabled: manager.isEnabled
        )
        self.eventBus.post(event: .urlFilterConfigurationChanged, userInfo: config)
    }

    /// Syncs ``SharedKeychainStorage/urlFilterEnabled`` with the derived status.
    ///
    /// Skips the write when the value already matches (idempotent) to prevent
    /// infinite cycles triggered by the app's own ``setEnabled(_:)`` calls.
    private func syncEnabledFromStatus(_ status: URLFilterStatus) {
        let newEnabled = status.isEnabled
        let currentEnabled = self.sharedKeychainStorage.urlFilterEnabled
        guard newEnabled != currentEnabled else { return }

        self.sharedKeychainStorage.urlFilterEnabled = newEnabled
        LogInfo("URLFilter enabled state updated to \(newEnabled) (status: \(status))")
    }

    private func startObservingPaidStatus() {
        let bus = self.eventBus
        let keychainStorage = self.sharedKeychainStorage
        self.paidStatusTask?.cancel()
        self.paidStatusTask = Task { [weak self] in
            for await notification in bus.notifications(for: .paidStatusChanged) {
                guard let self else { break }

                let license: AppStatusInfo? = bus.parseNotification(notification)
                let isPaid = license?.isPaid ?? false
                let desiredEnabled = isPaid && keychainStorage.urlFilterEnabled

                let status = await self.getStatus()
                guard status.isEnabled != desiredEnabled else { continue }

                do {
                    try await self.setEnabled(desiredEnabled)
                    LogInfo("URLFilter auto-\(desiredEnabled ? "enabled" : "disabled") successfully")
                } catch {
                    LogError(
                        "URLFilter auto-\(desiredEnabled ? "enable" : "disable") failed: \(error)"
                    )
                }
            }
        }
    }

    private func currentStatus() async -> URLFilterStatus {
        let manager = NEURLFilterManager.shared
        try? await manager.loadFromPreferences()
        async let status = manager.status
        let isEnabled = manager.isEnabled
        let serverURL = manager.pirServerURL
        async let lastError = manager.lastDisconnectError
        let raw = self.rawStatus(from: await status)
        let disconnectError = await lastError
        // The raw error is crucial for diagnosing filter failures, so log the enum case and raw value too.
        if let disconnectError {
            LogError(
                "URLFilter lastDisconnectError raw: \(disconnectError) "
                    + "(rawValue: \(disconnectError.rawValue))"
            )
        }
        return URLFilterStatus.derive(
            rawStatus: raw,
            isEnabled: isEnabled,
            hasValidConfiguration: serverURL != nil,
            errorMessage: disconnectError?.localizedDescription
        )
    }

    private func rawStatus(from status: NEURLFilterManager.Status) -> URLFilterRawStatus {
        switch status {
        case .invalid: return .invalid
        case .stopped: return .stopped
        case .starting: return .starting
        case .running: return .running
        case .stopping: return .stopping
        @unknown default: return .unknown
        }
    }
}

// MARK: - URLFilterServiceNoOp

/// No-op ``URLFilterService`` used on macOS < 26 where `NEURLFilterManager` is unavailable.
///
/// Every throwing method throws ``URLFilterServiceError/unsupportedPlatform``;
/// ``getStatus()`` returns ``URLFilterStatus/disabled``.
final actor URLFilterServiceNoOp: URLFilterService {
    func start() async {}

    func loadConfiguration() async throws -> URLFilterConfiguration? {
        throw URLFilterServiceError.unsupportedPlatform
    }

    func save(configuration _: URLFilterConfiguration) async throws {
        throw URLFilterServiceError.unsupportedPlatform
    }

    func removeConfiguration() async throws {
        throw URLFilterServiceError.unsupportedPlatform
    }

    func setEnabled(_: Bool) async throws {
        throw URLFilterServiceError.unsupportedPlatform
    }

    func getStatus() async -> URLFilterStatus {
        .disabled
    }

    func resetCache() async throws {
        throw URLFilterServiceError.unsupportedPlatform
    }
}
