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
}
