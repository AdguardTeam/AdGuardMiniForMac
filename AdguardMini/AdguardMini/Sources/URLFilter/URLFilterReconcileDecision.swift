// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterReconcileDecision.swift
//  AdguardMini
//

import Foundation

// MARK: - URLFilterReconcileDecision

/// Stateless decision logic for URL filter lifecycle transitions.
///
/// Automatic callers must never create a system configuration on their own,
/// and a missing one is left untouched: external removal is reconciled by the
/// config-change stream and the startup check, while a transient creation
/// failure must not drop the user's intent.
enum URLFilterReconcileDecision {
    /// The action an automatic transition should perform.
    enum Action: Equatable {
        /// The current state already matches; nothing to do.
        case noAction
        /// Enable the existing configuration.
        case enable
        /// Disable the existing configuration.
        case disable
    }

    /// The restart action a level change applies to the running filter.
    enum LevelRestartAction: Equatable {
        /// The filter must not run now; the new level applies on the next enable.
        case skip
        /// The filter is off but should run; a bring-up stages the new level.
        case enable
        /// The filter is running; disable then enable so the prefilter re-fetches.
        case restart
    }

    /// The outcome of sampling the enable preconditions around the suspending
    /// license check.
    enum EnablePreconditionOutcome: Equatable {
        /// Every precondition holds under a consistent snapshot.
        case holds
        /// An enable precondition consistently fails.
        case fails
        /// Protection or intent changed mid-check, so the snapshot decides
        /// nothing and the newer transition owns the outcome.
        case changed
    }

    /// Resolves the action for an automatic transition.
    ///
    /// - Parameters:
    ///   - desiredEnabled: Whether the filter should be enabled from the
    ///     user's perspective (main switch, license, persisted intent).
    ///   - configurationExists: Whether a system configuration is present.
    ///   - currentlyEnabled: Whether the filter is currently enabled.
    /// - Returns: The action to perform.
    static func resolve(
        desiredEnabled: Bool,
        configurationExists: Bool,
        currentlyEnabled: Bool
    ) -> Action {
        guard configurationExists else { return .noAction }
        guard currentlyEnabled != desiredEnabled else { return .noAction }
        return desiredEnabled ? .enable : .disable
    }

    /// Resolves the restart a level change needs from the desired and current
    /// filter states.
    ///
    /// The decision uses the desired state rather than the on-disk flag: an
    /// interrupted restart may have saved the disable but not the re-enable.
    ///
    /// - Parameters:
    ///   - desiredEnabled: Whether the filter should run (main switch, paid
    ///     license, persisted intent).
    ///   - currentlyEnabled: Whether the filter is currently enabled.
    /// - Returns: The action to apply.
    static func resolveLevelRestart(
        desiredEnabled: Bool,
        currentlyEnabled: Bool
    ) -> LevelRestartAction {
        guard desiredEnabled else { return .skip }
        return currentlyEnabled ? .restart : .enable
    }

    /// Whether an automatic enable may still proceed given the current preconditions.
    ///
    /// The preconditions are re-read fresh at the moment the enable is about
    /// To be applied, so an in-flight enable cannot override a disable that
    /// Arrived while the decision was being computed.
    static func shouldApplyEnable(protectionEnabled: Bool, userIntent: Bool, isPaid: Bool) -> Bool {
        protectionEnabled && userIntent && isPaid
    }

    /// Resolves whether an automatic enable may still proceed, from the
    /// preconditions sampled before and after the suspending license check.
    ///
    /// A change between the two samples returns ``EnablePreconditionOutcome/changed``,
    /// so neither an enable nor a disable may be derived from the snapshot.
    static func resolveEnablePreconditions(
        protectionBefore: Bool,
        intentBefore: Bool,
        protectionAfter: Bool,
        intentAfter: Bool,
        isPaid: Bool
    ) -> EnablePreconditionOutcome {
        guard protectionBefore == protectionAfter, intentBefore == intentAfter else {
            return .changed
        }
        return shouldApplyEnable(
            protectionEnabled: protectionAfter,
            userIntent: intentAfter,
            isPaid: isPaid
        ) ? .holds : .fails
    }

    /// Whether an enabled filter must be turned off because the user's license
    /// or persisted intent no longer justifies it.
    ///
    /// Guards against a configuration enabled outside the app: such a filter
    /// must not keep running without a paid license, the user's persisted
    /// intent, or the main switch. The main switch is included as a safety net:
    /// an enable that landed after the switch was turned off is disabled as
    /// soon as the filter reports itself running.
    static func shouldEnforceDisable(protectionEnabled: Bool, userIntent: Bool, isPaid: Bool) -> Bool {
        !protectionEnabled || !isPaid || !userIntent
    }

    /// Whether an enabled filter must be fail-safe disabled because it cannot
    /// run. Every non-running status schedules the disable while enabled: the
    /// grace period and the running re-check keep a filter that recovers in
    /// time, so the error class does not decide.
    ///
    /// - Parameters:
    ///   - status: The raw filter status.
    ///   - enabled: Whether the on-disk configuration is enabled.
    /// - Returns: `true` when the fail-safe disable must be scheduled.
    static func shouldFailSafeDisable(
        status: URLFilterRawStatus,
        enabled: Bool
    ) -> Bool {
        guard enabled else { return false }
        switch status {
        case .invalid, .stopped, .unknown:
            return true
        case .starting, .stopping, .running:
            return false
        }
    }

    /// Whether an observed state resolves a pending fail-safe disable.
    ///
    /// Only a running filter or a disabled configuration resolves it; a status
    /// change alone must not, or a crash loop would postpone the disable.
    static func isFailSafeDisableResolved(
        status: URLFilterRawStatus,
        enabled: Bool
    ) -> Bool {
        !enabled || status == .running
    }

    /// Whether the status is a terminal failure rather than a running filter or a transition.
    static func isFailSafeFailureStatus(_ status: URLFilterRawStatus) -> Bool {
        shouldFailSafeDisable(status: status, enabled: true)
    }

    /// The action the fail-safe disable needs from the latest observations.
    enum FailSafeDisableAction: Equatable {
        /// A running filter or a disabled configuration resolved the disable.
        case clear
        /// Keep the pending disable as it is.
        case keep
        /// Start the grace period for an observed enabled filter that cannot run.
        case schedule(URLFilterRawStatus)
        /// The grace elapsed while the filter still cannot run: disable now.
        case fire
    }

    /// Resolves the fail-safe disable action from the latest observations.
    ///
    /// Only a status reported by the change stream is trusted: before its first
    /// event a fresh manager read can report `.invalid` for a running filter,
    /// so the pending disable neither starts nor fires unobserved. Transitions
    /// defer the fire, so a slow bring-up survives while a crash loop fires at
    /// its next failure.
    static func failSafeDisableAction(
        observedStatus: URLFilterRawStatus?,
        enabled: Bool,
        hasPendingDisable: Bool,
        hasElapsedGrace: Bool
    ) -> FailSafeDisableAction {
        guard let observedStatus else { return .keep }
        guard !isFailSafeDisableResolved(status: observedStatus, enabled: enabled) else {
            return .clear
        }
        guard shouldFailSafeDisable(status: observedStatus, enabled: enabled) else {
            return .keep
        }
        guard hasPendingDisable else {
            return .schedule(observedStatus)
        }
        return hasElapsedGrace ? .fire : .keep
    }
}
