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
    /// How long an enable/start-time disconnect error stays suppressed when the
    /// status never changes. Shorter than `invalidDisableDelaySeconds`, so a
    /// broken filter shows its reason before the auto-disable kicks in.
    static let disconnectErrorSnapshotLifetimeSeconds: TimeInterval = 3
    /// One-shot delay before retrying an interrupted level restart.
    static let levelRestartRetryDelaySeconds: TimeInterval = 5

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
    /// Persists the user's SWP intent and applies the enable/disable.
    /// Automatic transitions (license, main switch, invalid-disable) go through
    /// `reconcile` and never overwrite the intent.
    /// While the main switch is off, an enable only persists the intent and
    /// ensures a disabled configuration exists for a later automatic bring-up;
    /// it neither enables the filter nor throws.
    /// - Throws: ``URLFilterServiceError/superseded`` when a newer transition
    ///   superseded the toggle before it landed; the intent is already persisted.
    func setEnabledByUser(_ enabled: Bool) async throws
    /// Keeps SWP in lockstep with the main switch: off disables it, on
    /// re-enables it only under persisted user intent and a paid license.
    /// Reads the main-switch state when it runs, so a delayed call cannot
    /// apply a stale switch value.
    /// Errors are logged internally, never thrown.
    func reconcile() async
    /// Enables or disables the filter and refreshes PIR parameters so it (re)starts.
    /// - Throws: ``URLFilterServiceError/superseded`` when a newer transition
    ///   superseded the level change before the restart completed.
    func setProtectionLevel(_ level: URLFilterProtectionLevel) async throws
    /// Returns the current derived filter status.
    /// While an app-initiated transition runs, the last settled state is
    /// returned so its intermediate disable/bring-up states never reach the UI.
    func getState() async throws -> URLFilterState
    /// Invalidates the prefilter cache so the extension re-fetches the prefilter
    /// data by calling `NEURLFilterManager.resetPIRCache()`.
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
    private let sharedSettingsStorage: SharedSettingsStorage
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
    /// The `lastDisconnectError` and status already present when the filter was
    /// last enabled or the app started. An error unchanged while the status
    /// stays the same is stale from a previous run, not a failure of the
    /// current one, so it must not surface until the status changes or the
    /// grace period expires.
    private struct DisconnectErrorSnapshot {
        let error: URLFilterError
        let status: URLFilterRawStatus
    }

    private var disconnectErrorSnapshot: DisconnectErrorSnapshot?
    private var disconnectErrorSnapshotTask: Task<Void, Never>?
    /// A newer transition supersedes any in-flight `setEnabled` retry, so a
    /// pending enable cannot complete after a disable/removal or a later toggle.
    private var transitionGeneration = 0
    /// Set while a level change still needs to restart the filter, so a
    /// re-selected level restarts it instead of no-op'ing on the level guard.
    private var levelRestartPending = false
    /// Single-flight bounded retry for an interrupted level restart.
    private var levelRestartTask: Task<Void, Never>?
    /// Non-zero while an app-initiated transition owns the end state. Its
    /// intermediate state changes are not published to the UI; see
    /// ``suspendStatePublishing()``.
    private var statePublishingSuspensions = 0
    /// The state the UI last saw before the current transition began; served
    /// by ``getState()`` while ``statePublishingSuspensions`` is non-zero.
    private var settledState: URLFilterState?

    init(
        eventBus: EventBus,
        sharedKeychainStorage: SharedKeychainStorage,
        sharedSettingsStorage: SharedSettingsStorage,
        licenseProvider: PIRLicenseProvider
    ) {
        self.eventBus = eventBus
        self.sharedKeychainStorage = sharedKeychainStorage
        self.sharedSettingsStorage = sharedSettingsStorage
        self.licenseProvider = licenseProvider
    }

    deinit {
        self.statusObservationTask?.cancel()
        self.configObservationTask?.cancel()
        self.paidStatusTask?.cancel()
        self.licenseInfoTask?.cancel()
        self.invalidDisableTask?.cancel()
        self.disconnectErrorSnapshotTask?.cancel()
        self.levelRestartTask?.cancel()
    }

    func start() async {
        let manager = NEURLFilterManager.shared
        // Only a confirmed-absent configuration reconciles the persisted
        // Intent away; a failed preferences load must not erase it.
        let loadSucceeded: Bool
        do {
            try await manager.loadFromPreferences()
            loadSucceeded = true
        } catch {
            LogWarn("URLFilter preferences load failed at startup: \(error)")
            loadSucceeded = false
        }
        if loadSucceeded {
            // Snapshot any pre-existing error so it is not surfaced as fresh.
            if manager.isEnabled {
                self.recordDisconnectErrorSnapshot(
                    error: self.rawLastDisconnectError(from: await manager.lastDisconnectError),
                    status: self.rawStatus(from: await manager.status)
                )
            }
            let state = await self.makeState(from: manager)
            self.cachedState = state
            // A configuration removed in System Settings while the app was
            // Closed is invisible to the config-change stream, so reconcile
            // The persisted intent against the actual state here.
            if state.serverURL == nil, self.userIntentEnabled {
                LogInfo("URLFilter configuration missing at startup; clearing persisted intent")
                self.persistURLFilterIntent(false)
            }
            LogInfo("URLFilter service started, current state: \(state)")
            // A configuration enabled outside the app must not outlive the
            // License or the user's persisted intent.
            await self.enforceFilterOwnership()
        }
        self.startObserving()
        self.startObservingPaidStatus()
    }

    private func persistURLFilterIntent(_ enabled: Bool) {
        self.sharedKeychainStorage.urlFilterEnabled = enabled
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

    private var userIntentEnabled: Bool {
        self.sharedKeychainStorage.urlFilterEnabled
    }

    /// The desired SWP state for a paid-status event: intent, main switch, paid.
    private func desiredEnabled(isPaid: Bool, userIntent: Bool) -> Bool {
        isPaid && userIntent && self.sharedSettingsStorage.protectionEnabled
    }

    func reconcile() async {
        // The whole reconciliation is one transition: hide its intermediate
        // States and publish only the settled result.
        self.suspendStatePublishing()
        defer { self.resumeStatePublishing() }
        // A filter enabled outside the app must not outlive the license or the
        // User's persisted intent.
        await self.enforceFilterOwnership()
        // Read the switch only now, after the last suspension point before the
        // Disable's generation bump: a delayed reconcile cannot apply a stale
        // Switch value, and the newer call owns the outcome.
        guard self.sharedSettingsStorage.protectionEnabled else {
            try? await self.applyAutomaticTransition(to: false)
            return
        }
        guard self.userIntentEnabled, await self.licenseProvider.isPaid() else { return }
        try? await self.applyAutomaticTransition(to: true)
    }

    /// Enforces the ownership invariant: the filter may only run under the main
    /// switch, a paid license, and the user's persisted intent. A configuration
    /// enabled outside the app is turned off, and a lost license also
    /// invalidates the staged credential so an external enable cannot keep
    /// authenticating.
    private func enforceFilterOwnership() async {
        let isPaid = await self.licenseProvider.isPaid()
        if !isPaid {
            await self.invalidateStagedToken()
        }
        let state = await self.currentState()
        guard state.enabled, state.serverURL != nil else { return }
        guard URLFilterReconcileDecision.shouldEnforceDisable(
            protectionEnabled: self.sharedSettingsStorage.protectionEnabled,
            userIntent: self.userIntentEnabled,
            isPaid: isPaid
        ) else {
            return
        }
        // The disable must decide against this fresh snapshot, not the cache:
        // An external enable refreshes cachedState only after enforcement.
        self.cachedState = state
        LogInfo("URLFilter enabled without the main switch, a paid license, or intent; disabling")
        do {
            try await self.applyAutomaticTransition(to: false, stageInvalidToken: !isPaid)
        } catch {
            if error is CancellationError { return }
            LogWarn("URLFilter ownership disable failed: \(error)")
        }
    }

    /// Samples the automatic-enable preconditions around the suspending license
    /// check, so the decision never mixes a stale switch state with a fresh one.
    private func resolveEnablePreconditions() async -> URLFilterReconcileDecision.EnablePreconditionOutcome {
        let protectionBefore = self.sharedSettingsStorage.protectionEnabled
        let intentBefore = self.userIntentEnabled
        let isPaid = await self.licenseProvider.isPaid()
        let protectionAfter = self.sharedSettingsStorage.protectionEnabled
        let intentAfter = self.userIntentEnabled
        return URLFilterReconcileDecision.resolveEnablePreconditions(
            protectionBefore: protectionBefore,
            intentBefore: intentBefore,
            protectionAfter: protectionAfter,
            intentAfter: intentAfter,
            isPaid: isPaid
        )
    }

    /// Throws ``URLFilterServiceError/superseded`` when a newer transition has
    /// advanced past the generation this operation belongs to.
    private func throwIfSuperseded(expectedGeneration: Int?) throws {
        if let expectedGeneration, expectedGeneration != self.transitionGeneration {
            throw URLFilterServiceError.superseded
        }
    }

    /// Begins a transition: bumps the generation so any in-flight operation is
    /// superseded, and returns the generation this transition owns.
    ///
    /// Every path that changes the desired state must start here: the
    /// generation is the guard that keeps a stale async completion from landing
    /// over a newer state.
    private func beginTransition() -> Int {
        self.transitionGeneration += 1
        return self.transitionGeneration
    }

    /// Starts hiding state publications while an app-initiated transition runs.
    ///
    /// Intermediate status/configuration events then stay internal, so the UI
    /// never observes the transient disabled/loading or bring-up error state
    /// of the app's own restart. One settled state is published once the
    /// transition ends.
    private func suspendStatePublishing() {
        // Capture the state the UI last saw, before the transition mutates it.
        if self.statePublishingSuspensions == 0 {
            self.settledState = self.cachedState
        }
        self.statePublishingSuspensions += 1
    }

    /// Ends one publication suppression and publishes the settled state when
    /// none remain.
    private func resumeStatePublishing() {
        self.statePublishingSuspensions = max(0, self.statePublishingSuspensions - 1)
        guard self.statePublishingSuspensions == 0 else { return }
        // The cache now holds the settled state; drop the pre-transition one.
        self.settledState = nil
        self.eventBus.post(event: .urlFilterConfigurationChanged, userInfo: nil)
    }

    /// Applies an automatic transition without ever creating a configuration.
    /// A missing configuration is left untouched: external removal is handled
    /// by the config-change stream and the startup check.
    /// - Throws: `CancellationError` when the surrounding task is cancelled.
    private func applyAutomaticTransition(
        to desiredEnabled: Bool,
        stageInvalidToken: Bool = false
    ) async throws {
        // A disable intent is authoritative even when no configuration exists:
        // With protection off (or intent cleared) no in-flight enable may land.
        if !desiredEnabled {
            _ = self.beginTransition()
        }
        // Decide against the freshly loaded configuration, not the cache: an
        // In-flight enable may have already saved while `cachedState` still
        // Reports the previous value, and the cross-check below would no-op.
        let state = await self.currentState()
        switch URLFilterReconcileDecision.resolve(
            desiredEnabled: desiredEnabled,
            configurationExists: state.serverURL != nil,
            currentlyEnabled: state.enabled
        ) {
        case .noAction:
            // An enable no-op must not supersede an in-flight user toggle.
            return
        case .enable:
            // Re-check the preconditions as one snapshot: a concurrent action
            // (Main switch, SWP toggle, license loss) may have changed them,
            // And an in-flight enable must not override that newer state.
            guard await self.resolveEnablePreconditions() == .holds else {
                LogInfo("URLFilter auto-enable skipped: preconditions did not hold")
                return
            }
            // Own this transition only after the preconditions hold: bump and
            // Capture so a concurrent action during the awaits above cannot be
            // Inherited by this enable.
            let generation = self.beginTransition()
            do {
                let applied = try await self.setEnabled(
                    true,
                    mayCreateConfiguration: false,
                    expectedGeneration: generation
                )
                LogInfo(
                    applied
                        ? "URLFilter auto-enabled successfully"
                        : "URLFilter auto-enable superseded by a newer transition"
                )
            } catch {
                // Cancellation is not a failure; rethrow to stop the loop.
                if error is CancellationError { throw error }
                LogWarn("URLFilter auto-enable failed: \(error)")
            }
        case .disable:
            // A stale disable must not override a newer state that now wants
            // The filter enabled: only a consistently failed snapshot justifies
            // The disable, while a changed one belongs to the newer transition.
            guard await self.resolveEnablePreconditions() == .fails else {
                LogInfo("URLFilter auto-disable skipped: preconditions hold or changed")
                return
            }
            let generation = self.beginTransition()
            do {
                let applied = try await self.setEnabled(
                    false,
                    mayCreateConfiguration: false,
                    expectedGeneration: generation,
                    stageInvalidToken: stageInvalidToken
                )
                LogInfo(
                    applied
                        ? "URLFilter auto-disabled successfully"
                        : "URLFilter auto-disable superseded by a newer transition"
                )
            } catch {
                // Cancellation is not a failure; rethrow to stop the loop.
                if error is CancellationError { throw error }
                LogWarn("URLFilter auto-disable failed: \(error)")
            }
        }
    }

    func removeConfiguration() async throws {
        // A removal supersedes any in-flight enable so a retrying enable cannot
        // Recreate the configuration the user just removed.
        _ = self.beginTransition()
        do {
            try await NEURLFilterManager.shared.removeFromPreferences()
        } catch {
            throw URLFilterServiceError.removeFailed(error)
        }
        LogInfo("URLFilter configuration removed")
        // Clear the intent so a license event or main-switch toggle
        // Cannot silently recreate a configuration the user removed.
        self.persistURLFilterIntent(false)
        self.needsRuntimeReload = false
        self.cachedState = nil
        self.eventBus.post(event: .urlFilterConfigurationChanged, userInfo: nil)
    }

    func setEnabledByUser(_ enabled: Bool) async throws {
        // The toggle is one transition: hide its intermediate states; the UI
        // Updates optimistically and gets the settled result at the end.
        self.suspendStatePublishing()
        defer { self.resumeStatePublishing() }
        // Persist intent before touching the system so a transient failure
        // Does not lose it; later reconciliation retries the system change.
        self.persistURLFilterIntent(enabled)
        // No transition starts here: an in-flight ownership disable must not
        // Be superseded, and automatic paths never create a configuration.
        if enabled, !self.sharedSettingsStorage.protectionEnabled {
            // Best-effort: a staging failure must not surface the misleading bring-up error.
            do {
                try await self.ensureDisabledConfigurationExists()
                // The switch may have come on while staging ran; reconcile so
                // The staged configuration is not left disabled.
                if self.sharedSettingsStorage.protectionEnabled {
                    await self.reconcile()
                }
            } catch {
                LogWarn("URLFilter disabled configuration staging failed: \(error)")
            }
            return
        }
        _ = self.beginTransition()
        let applied = try await self.setEnabled(enabled, mayCreateConfiguration: true)
        // A superseded toggle did not land: surface it so the UI rolls back
        // Instead of showing a state the system extension does not have.
        guard applied else {
            LogInfo("URLFilter user toggle superseded by a newer transition")
            throw URLFilterServiceError.superseded
        }
    }

    private func setEnabled(
        _ enabled: Bool,
        mayCreateConfiguration: Bool,
        expectedGeneration: Int? = nil,
        stageInvalidToken: Bool = false
    ) async throws -> Bool {
        var baseDelay = Constants.baseRetryDelaySeconds
        // The whole operation (including the retry loop) validates against one
        // Generation, so a newer transition supersedes it at any suspension.
        let generation = expectedGeneration ?? self.transitionGeneration

        for attempt in 1...Constants.maxRetryAttempts {
            // Do not retry after cancellation.
            try Task.checkCancellation()
            // A newer transition (user toggle, main switch, license, removal)
            // Supersedes this one; completing after it would undo its effect.
            guard generation == self.transitionGeneration else {
                LogInfo("URLFilter setEnabled(\(enabled)) superseded by a newer transition")
                return false
            }
            do {
                try await self.setEnabledOnce(
                    enabled,
                    mayCreateConfiguration: mayCreateConfiguration,
                    expectedGeneration: generation,
                    stageInvalidToken: stageInvalidToken
                )
                LogInfo("URLFilter setEnabled(\(enabled)) succeeded on attempt \(attempt)")
                return true
            } catch URLFilterServiceError.superseded {
                LogInfo("URLFilter setEnabled(\(enabled)) superseded by a newer transition")
                return false
            } catch {
                // Surface cancellation as `CancellationError`, not the underlying error.
                try Task.checkCancellation()
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
        return false
    }

    func setProtectionLevel(_ protectionLevel: URLFilterProtectionLevel) async throws {
        let currentLevel = self.sharedKeychainStorage.urlFilterProtectionLevel
        // Re-selecting the active level is normally a no-op, except when a
        // Previous level change persisted the level but failed to finish
        // Restarting the filter: the pending restart must still run.
        guard protectionLevel != currentLevel || self.levelRestartPending else {
            LogDebug("URLFilter protection level unchanged, skipping: \(protectionLevel)")
            return
        }
        // The restart is one transition: hide its intermediate disabled and
        // Bring-up states and publish only the settled result.
        self.suspendStatePublishing()
        defer { self.resumeStatePublishing() }
        self.levelRestartTask?.cancel()
        self.levelRestartTask = nil
        self.levelRestartPending = true
        self.sharedKeychainStorage.urlFilterProtectionLevel = protectionLevel
        LogInfo("URLFilter configuration saved: level=\(protectionLevel)")
        // A level change is a transition: it supersedes any in-flight retry so
        // The restart below is the sole owner of the desired end state.
        let operationGeneration = self.beginTransition()
        do {
            let applied = try await self.completeLevelChange(operationGeneration: operationGeneration)
            // A superseded restart did not land: surface it so the UI rolls
            // Back to the real state, matching the protocol's contract.
            guard applied else {
                throw URLFilterServiceError.superseded
            }
        } catch {
            // Keep the pending flag so the restart is retried instead of
            // No-op'ing on the level guard, and retry once automatically.
            LogWarn("URLFilter level change incomplete, restart pending: \(error)")
            switch error {
            case URLFilterServiceError.superseded, is CancellationError:
                // A newer transition or a teardown owns the outcome.
                break
            default:
                self.scheduleLevelRestartRetry()
            }
            throw error
        }
    }

    /// Stages the persisted level's token and restarts the running filter so
    /// `fetchPrefilter` re-runs with the new bloom URL. Leaves the pending flag
    /// set on failure and clears it once the level is applied.
    /// - Returns: Whether the restart completed; `false` when a newer
    ///   transition superseded it and therefore owns the outcome.
    @discardableResult
    private func completeLevelChange(operationGeneration: Int) async throws -> Bool {
        // A superseded restage throws and aborts the level change before
        // Anything stale is pushed to the running filter.
        let reloaded = try await self.refreshAuthenticationToken(
            expectedGeneration: operationGeneration
        )
        if !reloaded {
            try self.throwIfSuperseded(expectedGeneration: operationGeneration)
            try await self.refreshPIRParameters()
        }
        // Restart the filter to re-run `fetchPrefilter` with the new bloom URL.
        // The toggle uses `setEnabled`, so the user's intent is untouched.
        // Decide by the desired state, not the disk: an interrupted restart
        // May have saved the disable but not the re-enable.
        let state = await self.currentState()
        let isPaid = await self.licenseProvider.isPaid()
        let restartAction = URLFilterReconcileDecision.resolveLevelRestart(
            desiredEnabled: self.desiredEnabled(
                isPaid: isPaid,
                userIntent: self.userIntentEnabled
            ),
            currentlyEnabled: state.enabled
        )
        if restartAction == .restart {
            let disabled = try await self.setEnabled(
                false,
                mayCreateConfiguration: false,
                expectedGeneration: operationGeneration
            )
            guard disabled else {
                LogInfo("URLFilter level restart superseded by a newer transition")
                return false
            }
        }
        if restartAction != .skip {
            // A bring-up stages the current level, so a filter left off by an
            // Interrupted restart comes back on the new level.
            let enabled = try await self.setEnabled(
                true,
                mayCreateConfiguration: false,
                expectedGeneration: operationGeneration
            )
            guard enabled else {
                LogInfo("URLFilter level restart superseded by a newer transition")
                return false
            }
        }
        self.levelRestartPending = false
        // Best-effort: the level is already persisted and the filter restarted.
        do {
            try await self.resetCache()
        } catch {
            LogWarn("URLFilter prefilter cache reset failed after level change: \(error)")
        }
        return true
    }

    /// Retries an interrupted level restart once after a short delay, unless a
    /// newer transition or a successful bring-up resolves it first.
    private func scheduleLevelRestartRetry() {
        let generation = self.transitionGeneration
        self.levelRestartTask?.cancel()
        self.levelRestartTask = Task { [weak self] in
            try? await Task.sleep(seconds: Constants.levelRestartRetryDelaySeconds)
            guard let self, !Task.isCancelled else { return }
            await self.resumePendingLevelRestart(expectedGeneration: generation)
        }
    }

    /// Completes a level restart left pending by an earlier failure.
    private func resumePendingLevelRestart(expectedGeneration: Int) async {
        guard self.levelRestartPending, self.transitionGeneration == expectedGeneration else {
            return
        }
        // The retry is an app-initiated transition: hide its intermediate
        // Disabled and bring-up states and publish only the settled result.
        self.suspendStatePublishing()
        defer { self.resumeStatePublishing() }
        do {
            let operationGeneration = self.beginTransition()
            let applied = try await self.completeLevelChange(operationGeneration: operationGeneration)
            LogInfo(
                applied
                    ? "URLFilter level restart retry completed"
                    : "URLFilter level restart retry superseded by a newer transition"
            )
        } catch {
            LogWarn("URLFilter level restart retry failed: \(error)")
        }
    }

    /// Re-pushes the staged PIR parameters to the runtime so the running filter
    /// picks up token and endpoint changes without re-fetching the prefilter.
    private func refreshPIRParameters() async throws {
        do {
            try await NEURLFilterManager.shared.refreshPIRParameters()
            self.needsRuntimeReload = false
        } catch {
            // The disk is current; only the runtime is stale.
            self.needsRuntimeReload = true
            throw error
        }
    }

    private func setEnabledOnce(
        _ enabled: Bool,
        mayCreateConfiguration: Bool,
        expectedGeneration: Int,
        stageInvalidToken: Bool
    ) async throws {
        // Resolve the potentially slow credential query before loading preferences.
        // No await point then separates loading from saving on the shared manager.
        let license = enabled ? await self.licenseProvider.licenseCredential() : ""
        let manager = NEURLFilterManager.shared
        do {
            try await manager.loadFromPreferences()
        } catch {
            throw URLFilterServiceError.loadFailed(error)
        }
        // A real bring-up from disabled re-stages the current level and
        // Re-fetches its prefilter, so a pending level restart is fulfilled.
        let wasEnabled = manager.isEnabled
        // Snapshot any pre-existing error so the bring-up does not surface
        // It as a failure of this run; only errors after enable are fresh.
        if enabled {
            self.recordDisconnectErrorSnapshot(
                error: self.rawLastDisconnectError(from: await manager.lastDisconnectError),
                status: self.rawStatus(from: await manager.status)
            )
        }
        if manager.pirServerURL.isNil {
            // A concurrent removal must not be reverted by recreating the config.
            guard expectedGeneration == self.transitionGeneration else {
                throw URLFilterServiceError.superseded
            }
            // Only an explicit user action may install a new configuration;
            // Disabling without one is a successful no-op.
            guard self.shouldCreateConfiguration(
                enabled: enabled,
                mayCreateConfiguration: mayCreateConfiguration
            ) else {
                return
            }
            try await self.createConfiguration(
                using: manager,
                license: license,
                expectedGeneration: expectedGeneration
            )
            self.clearPendingLevelRestartIfBroughtUp(enabled: enabled, wasEnabled: wasEnabled)
            self.cachedState = await self.makeState(from: manager)
            return
        }
        try self.stageLevelConfiguration(
            enabled: enabled,
            license: license,
            manager: manager,
            stageInvalidToken: stageInvalidToken
        )
        manager.isEnabled = enabled
        // A newer disable/removal must not be undone by persisting this state.
        guard expectedGeneration == self.transitionGeneration else {
            throw URLFilterServiceError.superseded
        }
        do {
            try await manager.saveToPreferences()
        } catch NEURLFilterManager.Error.configurationUnchanged {
            // The enabled flag already matched; continue to refresh so the filter reflects state.
            LogDebug("URLFilter Configuration Unchanged")
        } catch {
            throw URLFilterServiceError.setEnabledFailed(error)
        }
        // The save already landed: reflect it in the cache even when a newer
        // Transition supersedes this one, so later decisions see the real state.
        guard expectedGeneration == self.transitionGeneration else {
            self.cachedState = await self.makeState(from: manager)
            throw URLFilterServiceError.superseded
        }
        do {
            try await self.refreshPIRParameters()
        } catch {
            throw URLFilterServiceError.setEnabledFailed(error)
        }
        self.clearPendingLevelRestartIfBroughtUp(enabled: enabled, wasEnabled: wasEnabled)
        self.cachedState = await self.makeState(from: manager)
    }

    /// A successful bring-up from disabled applies the current level and
    /// re-fetches its prefilter, so a pending level restart is fulfilled.
    private func clearPendingLevelRestartIfBroughtUp(enabled: Bool, wasEnabled: Bool) {
        guard enabled, !wasEnabled else { return }
        self.levelRestartPending = false
    }

    /// Stages the level's PIR endpoints and effective token on an enabled run.
    ///
    /// A transient credential gap must not overwrite a working token; the
    /// `.licenseInfoUpdated` stream restages it on the next event. A disable
    /// that follows a lost license stages an empty-license token instead, so an
    /// external enable cannot authenticate with the old credential.
    private func stageLevelConfiguration(
        enabled: Bool,
        license: String,
        manager: NEURLFilterManager,
        stageInvalidToken: Bool
    ) throws {
        let level = self.sharedKeychainStorage.urlFilterProtectionLevel
        if enabled {
            guard let levelConfig = URLFilterLevelConfiguration.defaultLevels[level] else {
                throw URLFilterServiceError.configurationMissing
            }
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
        } else if stageInvalidToken {
            guard let levelConfig = URLFilterLevelConfiguration.defaultLevels[level] else { return }
            let token = URLFilterLevelConfiguration.pirAuthenticationToken(for: level, license: "")
            try self.applyLevelConfiguration(
                levelConfig,
                to: manager,
                token: token
            )
        }
    }

    /// Reports whether a missing configuration should be created on this call.
    ///
    /// Disabling without a configuration is a successful no-op (for example a
    /// main-switch toggle before SWP was ever set up), and automatic callers
    /// may never install one: only an explicit user action may.
    private func shouldCreateConfiguration(enabled: Bool, mayCreateConfiguration: Bool) -> Bool {
        guard enabled else {
            LogInfo("URLFilter disable skipped: no configuration to disable")
            return false
        }
        guard mayCreateConfiguration else {
            LogWarn("URLFilter enable skipped: configuration is missing and automatic creation is not allowed")
            return false
        }
        return true
    }

    /// Ensures a disabled configuration exists so a later automatic enable can
    /// bring the filter up: automatic paths never create one.
    ///
    /// An already present configuration is left as is, so an ownership disable
    /// that is still in flight is not superseded.
    private func ensureDisabledConfigurationExists() async throws {
        let manager = NEURLFilterManager.shared
        do {
            try await manager.loadFromPreferences()
        } catch {
            throw URLFilterServiceError.loadFailed(error)
        }
        guard manager.pirServerURL == nil else {
            self.cachedState = await self.makeState(from: manager)
            return
        }
        try await self.createConfiguration(
            using: manager,
            license: "",
            enabled: false,
            expectedGeneration: self.transitionGeneration
        )
        self.cachedState = await self.makeState(from: manager)
    }

    /// Creates the System Settings configuration for the current protection
    /// level. The configuration starts enabled unless `enabled` is `false`.
    ///
    /// Expects the shared manager to be already loaded: no extra preferences
    /// load happens here. Defaults mirror ``URLFilterConfiguration`` so a
    /// fresh install behaves like an explicit save of the default configuration.
    ///
    /// An empty license is accepted on this path. The restaging paths refuse
    /// an empty credential because a working token may already be staged;
    /// a fresh configuration has none.
    private func createConfiguration(
        using manager: NEURLFilterManager,
        license: String,
        enabled: Bool = true,
        expectedGeneration: Int
    ) async throws {
        let configuration = URLFilterConfiguration(
            protectionLevel: self.sharedKeychainStorage.urlFilterProtectionLevel,
            enabled: enabled
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
        guard expectedGeneration == self.transitionGeneration else {
            throw URLFilterServiceError.superseded
        }
        do {
            try await manager.saveToPreferences()
        } catch NEURLFilterManager.Error.configurationUnchanged {
            // A matched configuration is still started by the refresh below, as in `setEnabledOnce`.
            LogDebug("URLFilter Configuration Unchanged")
        } catch {
            throw URLFilterServiceError.saveFailed(error)
        }
        // A disabled configuration has no runtime to reconcile, so the reload
        // Happens on the next enable rather than failing this staging request.
        if enabled {
            try self.throwIfSuperseded(expectedGeneration: expectedGeneration)
            do {
                try await self.refreshPIRParameters()
            } catch {
                throw URLFilterServiceError.setEnabledFailed(error)
            }
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
    private func refreshAuthenticationToken(expectedGeneration: Int? = nil) async throws -> Bool {
        let manager = NEURLFilterManager.shared
        let level = self.sharedKeychainStorage.urlFilterProtectionLevel
        guard let levelConfig = URLFilterLevelConfiguration.defaultLevels[level] else {
            return false
        }
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
        // A newer transition must not be undone by persisting the stale token.
        try self.throwIfSuperseded(expectedGeneration: expectedGeneration)
        do {
            try await manager.saveToPreferences()
        } catch NEURLFilterManager.Error.configurationUnchanged {
            // The save was a no-op; the reload below still reconciles the runtime.
            LogDebug("URLFilter Configuration Unchanged")
        } catch {
            LogWarn("URLFilter token refresh failed: \(error)")
            return false
        }
        try self.throwIfSuperseded(expectedGeneration: expectedGeneration)
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

    /// Replaces the staged PIR token with one that carries no license, so a
    /// filter enabled outside the app cannot authenticate while the license is
    /// gone. The configuration and the persisted intent are kept so SWP
    /// restores when the license returns.
    private func invalidateStagedToken() async {
        let manager = NEURLFilterManager.shared
        let level = self.sharedKeychainStorage.urlFilterProtectionLevel
        guard let levelConfig = URLFilterLevelConfiguration.defaultLevels[level] else { return }
        do {
            try await manager.loadFromPreferences()
        } catch {
            LogWarn("URLFilter token invalidation aborted: preferences load failed: \(error)")
            return
        }
        guard manager.pirServerURL != nil else { return }
        let invalidToken = URLFilterLevelConfiguration.pirAuthenticationToken(for: level, license: "")
        guard manager.pirAuthenticationToken != invalidToken else { return }
        // The invalidation rewrites the staged credential, so it owns a
        // Transition: an in-flight enable with an older generation must not
        // Re-stage the license token over or after the invalidation.
        let generation = self.beginTransition()
        do {
            try self.applyLevelConfiguration(levelConfig, to: manager, token: invalidToken)
            // A newer transition owns the end state; never clobber its token.
            try self.throwIfSuperseded(expectedGeneration: generation)
            try await manager.saveToPreferences()
            // A newer transition may have started while the save was in flight.
            try self.throwIfSuperseded(expectedGeneration: generation)
            // Keep later decisions (for example the ownership disable) fresh.
            self.cachedState = await self.makeState(from: manager)
            LogInfo("URLFilter PIR token invalidated: no paid license")
            try? await self.refreshPIRParameters()
        } catch URLFilterServiceError.superseded {
            LogInfo("URLFilter token invalidation superseded by a newer transition")
        } catch NEURLFilterManager.Error.configurationUnchanged {
            // The stored configuration already carries the invalid token.
        } catch {
            LogWarn("URLFilter token invalidation failed: \(error)")
        }
    }

    func getState() async -> URLFilterState {
        // While a transition owns the end state, only serve the state the UI
        // Already saw: the debounced assembly must not publish the
        // Transition's intermediate disable/bring-up states (or their
        // Stale errors) to the settings UI.
        if self.statePublishingSuspensions > 0, let settledState {
            LogDebug(
                "URLFilter state served from the settled snapshot: "
                    + "enabled=\(settledState.enabled), status=\(settledState.status)"
            )
            return settledState
        }
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
            try await manager.resetPIRCache()
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
        // Any status change makes the old error attributable to the new run;
        // `.running` also clears it, so recurring failures stay visible.
        if status == .running || self.disconnectErrorSnapshot?.status != self.rawStatus(from: status) {
            self.clearDisconnectErrorSnapshot()
        }

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

        // An enable that did not come through the app must not keep running
        // Without a paid license or the user's persisted intent.
        if status == .running {
            await self.enforceFilterOwnership()
        }

        guard self.statePublishingSuspensions == 0 else { return }
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
            await self.performInvalidDisable()
        }
    }

    /// Disables in one actor-isolated step so no transition can interleave
    /// Between the generation bump and the disable.
    private func performInvalidDisable() async {
        do {
            // An auto-disable supersedes any in-flight enable retry, but the
            // Automatic transition does not overwrite the user's intent.
            _ = self.beginTransition()
            let applied = try await self.setEnabled(false, mayCreateConfiguration: false)
            if applied {
                LogWarn("URLFilter disabled after staying invalid")
            } else {
                LogInfo("URLFilter invalid-disable superseded by a newer transition")
            }
        } catch {
            if error is CancellationError { return }
            LogError("URLFilter auto-disable on invalid failed: \(error)")
        }
    }

    private func publishConfigurationChange() async {
        let manager = NEURLFilterManager.shared
        do {
            try await manager.loadFromPreferences()
            if manager.pirServerURL.isNil {
                LogInfo("URLFilter configuration removed from system settings")
                // Supersede in-flight enables so they cannot recreate the
                // Configuration the user just removed.
                _ = self.beginTransition()
                // Clear intent only when the load confirms removal.
                self.persistURLFilterIntent(false)
                self.needsRuntimeReload = false
            } else if manager.isEnabled {
                // An enable that did not come through the app must not bypass
                // The license and intent checks.
                await self.enforceFilterOwnership()
            }
            // A failed load leaves the last good state in place.
            self.cachedState = await self.makeState(from: manager)
            guard self.statePublishingSuspensions == 0 else { return }
            self.eventBus.post(event: .urlFilterConfigurationChanged, userInfo: nil)
        } catch {
            LogWarn("URLFilter configuration change load failed: \(error)")
        }
    }

    private func startObservingPaidStatus() {
        let bus = self.eventBus
        self.paidStatusTask?.cancel()
        self.paidStatusTask = Task { [weak self] in
            for await notification in bus.notifications(for: .paidStatusChanged) {
                guard let self else { break }

                let license: AppStatusInfo? = bus.parseNotification(notification)
                let isPaid = license?.isPaid ?? false
                let userIntent = await self.userIntentEnabled
                // A lost license must invalidate the staged credential, so an
                // Externally enabled filter cannot keep authenticating.
                if !isPaid {
                    await self.invalidateStagedToken()
                }
                // Desired state comes from persisted intent; the main switch
                // Stays authoritative, so a license event never enables while
                // Protection is off.
                let desiredEnabled = await self.desiredEnabled(isPaid: isPaid, userIntent: userIntent)

                // Token refresh happens in the `.licenseInfoUpdated` stream below.
                do {
                    try await self.applyAutomaticTransition(
                        to: desiredEnabled,
                        stageInvalidToken: !isPaid
                    )
                } catch {
                    // Cancellation during teardown ends the observation loop.
                    break
                }
            }
        }
        self.licenseInfoTask?.cancel()
        self.licenseInfoTask = Task { [weak self] in
            for await notification in bus.notifications(for: .licenseInfoUpdated) {
                guard let self else { break }

                let generation = await self.transitionGeneration
                let license: AppStatusInfo? = bus.parseNotification(notification)
                let state = await self.getState()
                guard state.enabled, license?.isPaid ?? false else { continue }
                // A renewal can rotate the credential while staying paid; refresh.
                // A concurrent toggle/removal during the refresh supersedes it.
                do {
                    try await self.refreshAuthenticationToken(expectedGeneration: generation)
                } catch URLFilterServiceError.superseded {
                    LogInfo("URLFilter license-info refresh superseded by a newer transition")
                } catch {
                    LogWarn("URLFilter license-info refresh failed: \(error)")
                }
            }
        }
    }

    private func currentState() async -> URLFilterState {
        let manager = NEURLFilterManager.shared
        try? await manager.loadFromPreferences()
        return await self.makeState(from: manager)
    }

    private func makeState(from manager: NEURLFilterManager) async -> URLFilterState {
        let rawStatus = self.rawStatus(from: await manager.status)
        let rawError = self.rawLastDisconnectError(from: await manager.lastDisconnectError)
        // Read the synchronous properties once so the snapshot is consistent.
        let isEnabled = manager.isEnabled
        let serverURL = manager.pirServerURL
        let issuerURL = manager.pirPrivacyPassIssuerURL
        // An error unchanged while the status stays the same is stale, not a
        // New failure. Any status change makes it attributable to the new run.
        let snapshot = self.disconnectErrorSnapshot
        let isStaleError = isEnabled
            && rawError != nil
            && rawError == snapshot?.error
            && rawStatus == snapshot?.status
        let effectiveError = isStaleError ? nil : rawError
        return URLFilterState(
            enabled: isEnabled,
            status: rawStatus,
            serverURL: serverURL,
            issuerURL: issuerURL,
            lastDisconnectError: effectiveError
        )
    }

    /// Records the disconnect error present at enable/start time so it is not
    /// surfaced as fresh until the status changes or the grace period expires.
    private func recordDisconnectErrorSnapshot(error: URLFilterError?, status: URLFilterRawStatus) {
        self.clearDisconnectErrorSnapshot()
        guard let error else { return }
        self.disconnectErrorSnapshot = DisconnectErrorSnapshot(error: error, status: status)
        self.scheduleDisconnectErrorSnapshotExpiry()
    }

    /// Clears the stale-error snapshot and cancels its expiry timer.
    private func clearDisconnectErrorSnapshot() {
        self.disconnectErrorSnapshotTask?.cancel()
        self.disconnectErrorSnapshotTask = nil
        self.disconnectErrorSnapshot = nil
    }

    /// Clears the snapshot when the grace period passes without a status
    /// change, so a filter that never attempts bring-up still shows the reason.
    private func scheduleDisconnectErrorSnapshotExpiry() {
        self.disconnectErrorSnapshotTask?.cancel()
        self.disconnectErrorSnapshotTask = Task { [weak self] in
            try? await Task.sleep(seconds: Constants.disconnectErrorSnapshotLifetimeSeconds)
            guard let self, !Task.isCancelled else { return }
            await self.expireDisconnectErrorSnapshot()
        }
    }

    private func expireDisconnectErrorSnapshot() async {
        guard self.disconnectErrorSnapshot != nil else { return }
        self.clearDisconnectErrorSnapshot()
        // The error is no longer stale: rebuild so it can surface.
        let manager = NEURLFilterManager.shared
        try? await manager.loadFromPreferences()
        self.cachedState = await self.makeState(from: manager)
        guard self.statePublishingSuspensions == 0 else { return }
        self.eventBus.post(event: .urlFilterStatusChanged, userInfo: nil)
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

    func reconcile() async {}

    func setEnabledByUser(_: Bool) async throws {
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
