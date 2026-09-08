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
    static let invalidDisableDelaySeconds: TimeInterval = 5

    /// Display name shown in System Settings for the URL filter configuration.
    @available(macOS 26, *)
    static let systemSettingsDisplayName = LocalizedStringResource(stringLiteral: BuildConfig.AG_APP_DISPLAYED_NAME)
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
    /// Removes the configuration from System Settings and publishes
    /// `urlFilterConfigurationChanged`.
    func removeConfiguration() async throws
    /// Enables or disables the filter and refreshes PIR parameters so it (re)starts.
    func setEnabled(_ enabled: Bool) async throws
    /// Enables or disables the filter and refreshes PIR parameters so it (re)starts.
    func setProtectionLevel(_ level: URLFilterProtectionLevel) async throws
    /// Returns the current derived filter status.
    func getState() async throws -> URLFilterState
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
    private let licenseProvider: PIRLicenseProvider
    private var statusObservationTask: Task<Void, Never>?
    private var configObservationTask: Task<Void, Never>?
    private var paidStatusTask: Task<Void, Never>?
    private var licenseInfoTask: Task<Void, Never>?
    private var lastObservedStatus: NEURLFilterManager.Status?
    private var cachedState: URLFilterState?
    private var invalidDisableTask: Task<Void, Never>?
    /// The last PIR parameter reload failed while the on-disk configuration was
    /// already staged. Until a reload succeeds the runtime may lag the disk, so
    /// refreshes must reload even when the stored token already matches.
    private var needsRuntimeReload = false

    init(
        eventBus: EventBus,
        sharedKeychainStorage: SharedKeychainStorage,
        licenseProvider: PIRLicenseProvider
    ) {
        self.eventBus = eventBus
        self.sharedKeychainStorage = sharedKeychainStorage
        self.licenseProvider = licenseProvider
    }

    deinit {
        self.statusObservationTask?.cancel()
        self.configObservationTask?.cancel()
        self.paidStatusTask?.cancel()
        self.licenseInfoTask?.cancel()
        self.invalidDisableTask?.cancel()
    }

    func start() async {
        let state = await self.currentState()
        self.cachedState = state
        LogInfo("URLFilter service started, current state: \(state)")
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

    func removeConfiguration() async throws {
        do {
            try await NEURLFilterManager.shared.removeFromPreferences()
        } catch {
            throw URLFilterServiceError.removeFailed(error)
        }
        LogInfo("URLFilter configuration removed")
        // A removed configuration leaves nothing to reconcile in the runtime.
        self.needsRuntimeReload = false
        self.cachedState = nil
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

    func setProtectionLevel(_ protectionLevel: URLFilterProtectionLevel) async throws {
        self.sharedKeychainStorage.urlFilterProtectionLevel = protectionLevel
        LogInfo("URLFilter configuration saved: level=\(protectionLevel)")
        // The staged token encodes the protection level. Re-stage it now.
        // Otherwise the level change lands only on the next license event.
        // A successful re-stage already reloads; resetCache covers the rest.
        let reloaded = await self.refreshAuthenticationToken()
        if !reloaded {
            try await self.resetCache()
        }
    }

    private func setEnabledOnce(_ enabled: Bool) async throws {
        // Resolve the potentially slow credential query before loading preferences.
        // No await point then separates loading from saving on the shared manager.
        let license = enabled ? await self.licenseProvider.licenseCredential() : ""
        let manager = NEURLFilterManager.shared
        do {
            try await manager.loadFromPreferences()
        } catch {
            throw URLFilterServiceError.loadFailed(error)
        }
        if manager.pirServerURL.isNil {
            // First enable after a fresh install: no configuration exists in
            // System Settings yet, so create one for the current protection
            // Level before enabling. Disabling without a configuration has
            // Nothing to disable and stays an error.
            guard enabled else { throw URLFilterServiceError.configurationMissing }
            try await self.createConfiguration(using: manager, license: license)
            self.cachedState = await self.makeState(from: manager)
            return
        }
        if enabled {
            let level = self.sharedKeychainStorage.urlFilterProtectionLevel
            guard let levelConfig = URLFilterLevelConfiguration.defaultLevels[level] else {
                throw URLFilterServiceError.configurationMissing
            }
            // A transient credential gap must not overwrite the working token.
            // The `.licenseInfoUpdated` stream restages it on the next event.
            if !license.isEmpty || !levelConfig.pirAuthenticationToken.isEmpty {
                let token = URLFilterLevelConfiguration.effectiveAuthenticationToken(
                    configured: levelConfig.pirAuthenticationToken,
                    for: level,
                    license: license
                )
                try self.applyLevelConfiguration(
                    levelConfig,
                    to: manager,
                    token: token
                )
            } else {
                LogWarn("URLFilter enable token staging skipped: no license credential")
            }
        }
        manager.isEnabled = enabled
        do {
            try await manager.saveToPreferences()
        } catch NEURLFilterManager.Error.configurationUnchanged {
            // The enabled flag already matched; continue to refresh so the filter reflects state.
            LogDebug("URLFilter Configuration Unchanged")
        } catch {
            throw URLFilterServiceError.setEnabledFailed(error)
        }
        do {
            try await manager.refreshPIRParameters()
            self.needsRuntimeReload = false
        } catch {
            // The saved configuration is current; only the runtime is stale.
            self.needsRuntimeReload = true
            throw URLFilterServiceError.setEnabledFailed(error)
        }
        self.cachedState = await self.makeState(from: manager)
    }

    /// Creates the System Settings configuration for the current protection
    /// level and enables the filter.
    ///
    /// Called by the first-enable path only; the shared manager is already
    /// loaded, so no extra preferences load happens here. Defaults mirror
    /// ``URLFilterConfiguration`` so a fresh install behaves like an explicit
    /// save of the default configuration.
    ///
    /// An empty license is accepted on this path. The restaging paths refuse
    /// an empty credential because a working token may already be staged;
    /// a fresh configuration has none.
    private func createConfiguration(using manager: NEURLFilterManager, license: String) async throws {
        let configuration = URLFilterConfiguration(
            protectionLevel: self.sharedKeychainStorage.urlFilterProtectionLevel,
            enabled: true
        )
        guard let levelConfig = URLFilterLevelConfiguration.defaultLevels[
            configuration.protectionLevel
        ] else {
            throw URLFilterServiceError.configurationMissing
        }
        let token = URLFilterLevelConfiguration.effectiveAuthenticationToken(
            configured: levelConfig.pirAuthenticationToken,
            for: configuration.protectionLevel,
            license: license
        )
        try self.applyLevelConfiguration(
            levelConfig,
            to: manager,
            token: token
        )
        manager.prefilterFetchInterval = configuration.prefilterFetchInterval
        manager.shouldFailClosed = configuration.shouldFailClosed
        manager.isEnabled = configuration.enabled
        manager.localizedDescription = Constants.systemSettingsDisplayName
        do {
            try await manager.saveToPreferences()
        } catch NEURLFilterManager.Error.configurationUnchanged {
            // Configuration already matched, so the refresh below starts the filter.
            // `setEnabledOnce` mirrors this path.
            LogDebug("URLFilter Configuration Unchanged")
        } catch {
            throw URLFilterServiceError.saveFailed(error)
        }
        do {
            try await manager.refreshPIRParameters()
            self.needsRuntimeReload = false
        } catch {
            // The saved configuration is current; only the runtime is stale.
            self.needsRuntimeReload = true
            throw URLFilterServiceError.setEnabledFailed(error)
        }
        LogInfo(
            "URLFilter configuration created: level=\(configuration.protectionLevel), "
                + "server=\(levelConfig.pirServerURL), enabled=\(configuration.enabled)"
        )
        self.eventBus.post(event: .urlFilterConfigurationChanged, userInfo: nil)
    }

    /// Refreshes the stored PIR token after a license or level change.
    ///
    /// Skips all work while the configuration already carries the effective
    /// token, unless a previous PIR reload failed and the runtime must be
    /// reconciled with the saved configuration.
    /// - Returns: Whether the PIR parameters were reloaded successfully, so a
    /// caller with no remaining work can skip its own reload.
    @discardableResult
    private func refreshAuthenticationToken() async -> Bool {
        let manager = NEURLFilterManager.shared
        let level = self.sharedKeychainStorage.urlFilterProtectionLevel
        guard let levelConfig = URLFilterLevelConfiguration.defaultLevels[level] else {
            return false
        }
        // Resolve the potentially slow credential query before loading preferences.
        // No await point then separates loading from saving on the shared manager.
        let license = await self.licenseProvider.licenseCredential()
        do {
            try await manager.loadFromPreferences()
        } catch {
            LogWarn("URLFilter token refresh aborted: preferences load failed: \(error)")
            return false
        }
        guard manager.pirServerURL != nil else { return false }
        guard !license.isEmpty || !levelConfig.pirAuthenticationToken.isEmpty else {
            // A transient StoreKit gap must not overwrite a working token.
            LogWarn("URLFilter token refresh skipped: no license credential")
            return false
        }
        let effectiveToken = URLFilterLevelConfiguration.effectiveAuthenticationToken(
            configured: levelConfig.pirAuthenticationToken,
            for: level,
            license: license
        )
        // Endpoints are compared too.
        // A dev-config override token can be shared across levels and mask them.
        if manager.pirAuthenticationToken == effectiveToken,
           manager.pirServerURL == levelConfig.pirServerURL,
           manager.pirPrivacyPassIssuerURL == levelConfig.pirPrivacyPassIssuerURL,
           !self.needsRuntimeReload {
            LogDebug("URLFilter token refresh skipped: configuration already staged")
            return false
        }
        do {
            try self.applyLevelConfiguration(
                levelConfig,
                to: manager,
                token: effectiveToken
            )
        } catch {
            LogWarn("URLFilter token staging failed: \(error)")
            return false
        }
        do {
            try await manager.saveToPreferences()
        } catch NEURLFilterManager.Error.configurationUnchanged {
            // The save was a no-op; the reload below still reconciles the runtime.
            LogDebug("URLFilter Configuration Unchanged")
        } catch {
            LogWarn("URLFilter token refresh failed: \(error)")
            return false
        }
        do {
            try await manager.refreshPIRParameters()
            self.needsRuntimeReload = false
            return true
        } catch {
            // The disk is current; only the runtime is stale. A later refresh reloads anyway.
            self.needsRuntimeReload = true
            LogWarn("URLFilter token refresh PIR reload failed: \(error)")
            return false
        }
    }

    /// Stages the level's PIR endpoints and the given token on the manager.
    private func applyLevelConfiguration(
        _ levelConfig: URLFilterLevelConfiguration,
        to manager: NEURLFilterManager,
        token: String
    ) throws {
        try manager.setConfiguration(
            pirServerURL: levelConfig.pirServerURL,
            pirPrivacyPassIssuerURL: levelConfig.pirPrivacyPassIssuerURL,
            pirAuthenticationToken: token,
            controlProviderBundleIdentifier: BuildConfig.AG_NETWORK_EXTENSION_BUNDLEID
        )
    }

    func getState() async -> URLFilterState {
        if let cachedState {
            return cachedState
        }
        let state = await self.currentState()
        self.cachedState = state
        return state
    }

    func resetCache() async throws {
        let manager = NEURLFilterManager.shared
        do {
            try await manager.refreshPIRParameters()
            self.needsRuntimeReload = false
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
            for await status in NEURLFilterManager.shared.handleStatusChange() {
                await self?.handleStatusChange(status)
            }
        }
        self.configObservationTask?.cancel()
        self.configObservationTask = Task { [weak self] in
            for await _ in NEURLFilterManager.shared.handleConfigChange() {
                await self?.publishConfigurationChange()
            }
        }
    }

    private func handleStatusChange(_ status: NEURLFilterManager.Status) async {
        // The framework can re-emit the same status on every query.
        // Only real transitions are published, so observers do not spin.
        guard status != self.lastObservedStatus else { return }
        self.lastObservedStatus = status
        LogInfo("URLFilter status changed: \(status)")

        if self.cachedState != nil {
            // Rebuild from the manager so status, enabled flag, and latest
            // `lastDisconnectError` reflect the transition, not a stale snapshot.
            let manager = NEURLFilterManager.shared
            try? await manager.loadFromPreferences()
            self.cachedState = await self.makeState(from: manager)
        }

        self.invalidDisableTask?.cancel()
        if status == .invalid {
            self.scheduleInvalidDisable()
        }

        self.eventBus.post(event: .urlFilterStatusChanged, userInfo: nil)
    }

    /// Turns the filter off when a `.invalid` status persists while enabled.
    /// Avoids a broken enabled state and repeated restart cycles instead.
    /// Cancelled by any later status transition, so a normal bring-up
    /// Remains untouched while it only passes through `.invalid` briefly.
    private func scheduleInvalidDisable() {
        self.invalidDisableTask = Task { [weak self] in
            try? await Task.sleep(seconds: Constants.invalidDisableDelaySeconds)
            guard let self, !Task.isCancelled else { return }
            let state = await self.currentState()
            guard state.enabled, state.status == .invalid else { return }
            do {
                try await self.setEnabled(false)
                LogWarn("URLFilter disabled after staying invalid")
            } catch {
                LogError("URLFilter auto-disable on invalid failed: \(error)")
            }
        }
    }

    private func publishConfigurationChange() async {
        let manager = NEURLFilterManager.shared
        try? await manager.loadFromPreferences()

        if manager.pirServerURL.isNil {
            LogInfo("URLFilter configuration removed from system settings")
            // A removed configuration leaves nothing to reconcile in the runtime.
            self.needsRuntimeReload = false
        }
        self.cachedState = await self.makeState(from: manager)
        self.eventBus.post(event: .urlFilterConfigurationChanged, userInfo: nil)
    }

    private func startObservingPaidStatus() {
        let bus = self.eventBus
        self.paidStatusTask?.cancel()
        self.paidStatusTask = Task { [weak self] in
            for await notification in bus.notifications(for: .paidStatusChanged) {
                guard let self else { break }

                let license: AppStatusInfo? = bus.parseNotification(notification)
                let isPaid = license?.isPaid ?? false
                let state = await self.getState()
                let desiredEnabled = isPaid && state.enabled

                // Token refresh happens in the `.licenseInfoUpdated` stream below.
                guard state.enabled != desiredEnabled else { continue }
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
        self.licenseInfoTask?.cancel()
        self.licenseInfoTask = Task { [weak self] in
            for await notification in bus.notifications(for: .licenseInfoUpdated) {
                guard let self else { break }

                let license: AppStatusInfo? = bus.parseNotification(notification)
                let state = await self.getState()
                guard state.enabled, license?.isPaid ?? false else { continue }
                // Renewal can rotate the credential while staying paid; refresh.
                await self.refreshAuthenticationToken()
            }
        }
    }

    private func currentState() async -> URLFilterState {
        let manager = NEURLFilterManager.shared
        try? await manager.loadFromPreferences()
        return await self.makeState(from: manager)
    }

    private func makeState(from manager: NEURLFilterManager) async -> URLFilterState {
        URLFilterState(
            enabled: manager.isEnabled,
            status: self.rawStatus(from: await manager.status),
            serverURL: manager.pirServerURL,
            issuerURL: manager.pirPrivacyPassIssuerURL,
            lastDisconnectError: self.rawLastDisconnectError(from: await manager.lastDisconnectError)
        )
    }

    private func rawStatus(from status: NEURLFilterManager.Status) -> URLFilterRawStatus {
        switch status {
        case .invalid:    .invalid
        case .stopped:    .stopped
        case .starting:   .starting
        case .running:    .running
        case .stopping:   .stopping
        @unknown default: .unknown
        }
    }

    // NEURLFilterManager.Error has a lot of cases
    // swiftlint:disable:next cyclomatic_complexity
    private func rawLastDisconnectError(from error: NEURLFilterManager.Error?) -> URLFilterError? {
        guard let error else { return nil }

        return switch error {
        case .configurationUnchanged:        .configurationUnchanged
        case .configurationInvalid:          .configurationInvalid
        case .configurationDisabled:         .configurationDisabled
        case .configurationStale:            .configurationStale
        case .configurationCannotBeRemoved:  .configurationCannotBeRemoved
        case .configurationPermissionDenied: .configurationPermissionDenied
        case .configurationInternalError:    .configurationInternalError
        case .configurationNotLoaded:        .configurationNotLoaded
        case .serverSetupIncomplete:         .serverSetupIncomplete
        case .internalError:                 .internalError
        case .extensionCancelled:            .extensionCancelled
        case .extensionNotFound:             .extensionNotFound
        case .extensionFailedToLoad:         .extensionFailedToLoad
        case .unknown:                       .unknown
        @unknown default:                    .unknown
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

    func getState() async throws -> URLFilterState {
        throw URLFilterServiceError.unsupportedPlatform
    }

    func setProtectionLevel(_ level: URLFilterProtectionLevel) async throws {
        throw URLFilterServiceError.unsupportedPlatform
    }

    func resetCache() async throws {
        throw URLFilterServiceError.unsupportedPlatform
    }
}
