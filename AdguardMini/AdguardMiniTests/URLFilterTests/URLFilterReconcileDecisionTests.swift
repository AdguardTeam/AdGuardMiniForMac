// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterReconcileDecisionTests.swift
//  AdguardMiniTests
//

import XCTest

final class URLFilterReconcileDecisionTests: XCTestCase {
    func testMissingConfigurationWithDesiredEnabledDoesNothing() {
        let action = URLFilterReconcileDecision.resolve(
            desiredEnabled: true,
            configurationExists: false,
            currentlyEnabled: false
        )

        XCTAssertEqual(action, .noAction)
    }

    func testMissingConfigurationWithoutDesiredEnabledDoesNothing() {
        let action = URLFilterReconcileDecision.resolve(
            desiredEnabled: false,
            configurationExists: false,
            currentlyEnabled: false
        )

        XCTAssertEqual(action, .noAction)
    }

    func testExistingDisabledConfigurationResolvesToEnable() {
        let action = URLFilterReconcileDecision.resolve(
            desiredEnabled: true,
            configurationExists: true,
            currentlyEnabled: false
        )

        XCTAssertEqual(action, .enable)
    }

    func testExistingEnabledConfigurationNotDesiredResolvesToDisable() {
        let action = URLFilterReconcileDecision.resolve(
            desiredEnabled: false,
            configurationExists: true,
            currentlyEnabled: true
        )

        XCTAssertEqual(action, .disable)
    }

    func testMatchingStateDoesNothing() {
        let enabled = URLFilterReconcileDecision.resolve(
            desiredEnabled: true,
            configurationExists: true,
            currentlyEnabled: true
        )
        let disabled = URLFilterReconcileDecision.resolve(
            desiredEnabled: false,
            configurationExists: true,
            currentlyEnabled: false
        )

        XCTAssertEqual(enabled, .noAction)
        XCTAssertEqual(disabled, .noAction)
    }

    // MARK: resolveLevelRestart

    func testResolveLevelRestart_DoesNothingWhenTheFilterMustNotRun() {
        XCTAssertEqual(
            URLFilterReconcileDecision.resolveLevelRestart(
                desiredEnabled: false,
                currentlyEnabled: true
            ),
            .skip
        )
        XCTAssertEqual(
            URLFilterReconcileDecision.resolveLevelRestart(
                desiredEnabled: false,
                currentlyEnabled: false
            ),
            .skip
        )
    }

    func testResolveLevelRestart_RestartsARunningFilter() {
        XCTAssertEqual(
            URLFilterReconcileDecision.resolveLevelRestart(
                desiredEnabled: true,
                currentlyEnabled: true
            ),
            .restart
        )
    }

    /// A restart interrupted after saving the disable leaves the filter off;
    /// the level change must bring it back up instead of skipping the restart.
    func testResolveLevelRestart_BringsUpADisabledFilter() {
        XCTAssertEqual(
            URLFilterReconcileDecision.resolveLevelRestart(
                desiredEnabled: true,
                currentlyEnabled: false
            ),
            .enable
        )
    }

    // MARK: shouldApplyEnable

    func testShouldApplyEnable_AllowsWhenAllPreconditionsHold() {
        XCTAssertTrue(
            URLFilterReconcileDecision.shouldApplyEnable(
                protectionEnabled: true,
                userIntent: true,
                isPaid: true
            )
        )
    }

    func testShouldApplyEnable_BlocksWhenProtectionIsOff() {
        XCTAssertFalse(
            URLFilterReconcileDecision.shouldApplyEnable(
                protectionEnabled: false,
                userIntent: true,
                isPaid: true
            )
        )
    }

    func testShouldApplyEnable_BlocksWithoutPersistedIntent() {
        XCTAssertFalse(
            URLFilterReconcileDecision.shouldApplyEnable(
                protectionEnabled: true,
                userIntent: false,
                isPaid: true
            )
        )
    }

    func testShouldApplyEnable_BlocksWithoutPaidLicense() {
        XCTAssertFalse(
            URLFilterReconcileDecision.shouldApplyEnable(
                protectionEnabled: true,
                userIntent: true,
                isPaid: false
            )
        )
    }

    func testShouldApplyEnable_BlocksWhenOnlyOnePreconditionHolds() {
        XCTAssertFalse(
            URLFilterReconcileDecision.shouldApplyEnable(
                protectionEnabled: true,
                userIntent: false,
                isPaid: false
            )
        )
    }

    // MARK: shouldEnforceDisable

    func testShouldEnforceDisable_AllowsWhenEveryConditionHolds() {
        XCTAssertFalse(
            URLFilterReconcileDecision.shouldEnforceDisable(
                protectionEnabled: true,
                userIntent: true,
                isPaid: true
            )
        )
    }

    func testShouldEnforceDisable_EnforcesWithoutPaidLicense() {
        XCTAssertTrue(
            URLFilterReconcileDecision.shouldEnforceDisable(
                protectionEnabled: true,
                userIntent: true,
                isPaid: false
            )
        )
    }

    func testShouldEnforceDisable_EnforcesWithoutPersistedIntent() {
        XCTAssertTrue(
            URLFilterReconcileDecision.shouldEnforceDisable(
                protectionEnabled: true,
                userIntent: false,
                isPaid: true
            )
        )
    }

    func testShouldEnforceDisable_EnforcesWithMainSwitchOff() {
        XCTAssertTrue(
            URLFilterReconcileDecision.shouldEnforceDisable(
                protectionEnabled: false,
                userIntent: true,
                isPaid: true
            )
        )
    }

    func testShouldEnforceDisable_EnforcesWhenNothingHolds() {
        XCTAssertTrue(
            URLFilterReconcileDecision.shouldEnforceDisable(
                protectionEnabled: false,
                userIntent: false,
                isPaid: false
            )
        )
    }

    // MARK: shouldFailSafeDisable

    /// Any non-running status while enabled schedules the disable; the grace
    /// period and the running re-check decide, so the error class is irrelevant.
    func testShouldFailSafeDisable_DisablesNonRunningStatesWhenEnabled() {
        for status in [URLFilterRawStatus.invalid, .stopped, .unknown] {
            XCTAssertTrue(
                URLFilterReconcileDecision.shouldFailSafeDisable(
                    status: status,
                    enabled: true
                ),
                "\(status) must trigger the fail-safe disable while enabled"
            )
        }
    }

    func testShouldFailSafeDisable_DoesNotDisableWhenConfigurationIsDisabled() {
        XCTAssertFalse(
            URLFilterReconcileDecision.shouldFailSafeDisable(
                status: .invalid,
                enabled: false
            )
        )
    }

    func testShouldFailSafeDisable_DoesNotDisableARunningFilter() {
        XCTAssertFalse(
            URLFilterReconcileDecision.shouldFailSafeDisable(
                status: .running,
                enabled: true
            )
        )
    }

    func testShouldFailSafeDisable_DoesNotDisableDuringTransitions() {
        for status in [URLFilterRawStatus.starting, .stopping] {
            XCTAssertFalse(
                URLFilterReconcileDecision.shouldFailSafeDisable(
                    status: status,
                    enabled: true
                ),
                "\(status) must not trigger the fail-safe disable"
            )
        }
    }

    // MARK: isFailSafeDisableResolved

    func testIsFailSafeDisableResolved_ResolvesARunningFilter() {
        XCTAssertTrue(
            URLFilterReconcileDecision.isFailSafeDisableResolved(
                status: .running,
                enabled: true
            )
        )
    }

    func testIsFailSafeDisableResolved_ResolvesADisabledConfiguration() {
        XCTAssertTrue(
            URLFilterReconcileDecision.isFailSafeDisableResolved(
                status: .invalid,
                enabled: false
            )
        )
    }

    /// The crash-loop regression: a filter that alternates start attempts with
    /// failures must keep its pending disable on every status change.
    func testIsFailSafeDisableResolved_KeepsAPendingDisableThroughACrashLoop() {
        let statuses: [URLFilterRawStatus] = [
            .invalid, .stopped, .starting, .stopping, .unknown
        ]

        for status in statuses {
            XCTAssertFalse(
                URLFilterReconcileDecision.isFailSafeDisableResolved(
                    status: status,
                    enabled: true
                ),
                "\(status) must not resolve a pending fail-safe disable"
            )
        }
    }

    // MARK: failSafeDisableAction

    /// The regression: a stale `.invalid` read must not override an observed `.running`.
    func testFailSafeDisableAction_ObservedRunningResolvesAStaleRead() {
        XCTAssertEqual(
            URLFilterReconcileDecision.failSafeDisableAction(
                observedStatus: .running,
                enabled: true,
                hasPendingDisable: true,
                hasElapsedGrace: true
            ),
            .clear
        )
    }

    func testFailSafeDisableAction_ObservedRunningDoesNotSchedule() {
        XCTAssertEqual(
            URLFilterReconcileDecision.failSafeDisableAction(
                observedStatus: .running,
                enabled: true,
                hasPendingDisable: false,
                hasElapsedGrace: false
            ),
            .clear
        )
    }

    /// Before the first change-stream event the derived read is not trusted: it
    /// can report `.invalid` for a running filter, so nothing is armed.
    func testFailSafeDisableAction_UnobservedStatusNeitherSchedulesNorFires() {
        for hasPendingDisable in [false, true] {
            XCTAssertEqual(
                URLFilterReconcileDecision.failSafeDisableAction(
                    observedStatus: nil,
                    enabled: true,
                    hasPendingDisable: hasPendingDisable,
                    hasElapsedGrace: true
                ),
                .keep,
                "An unobserved status must not start or fire the disable"
            )
        }
    }

    /// A broken filter starts the grace even when a stale read reports it running.
    func testFailSafeDisableAction_ObservedInvalidStartsTheGracePeriod() {
        XCTAssertEqual(
            URLFilterReconcileDecision.failSafeDisableAction(
                observedStatus: .invalid,
                enabled: true,
                hasPendingDisable: false,
                hasElapsedGrace: false
            ),
            .schedule(.invalid)
        )
    }

    /// Within the grace, only running or disabled resolves or restarts the disable.
    func testFailSafeDisableAction_KeepsAPendingDisableThroughACrashLoop() {
        let statuses: [URLFilterRawStatus] = [
            .invalid, .stopped, .starting, .stopping, .unknown
        ]

        for status in statuses {
            XCTAssertEqual(
                URLFilterReconcileDecision.failSafeDisableAction(
                    observedStatus: status,
                    enabled: true,
                    hasPendingDisable: true,
                    hasElapsedGrace: false
                ),
                .keep,
                "\(status) must not resolve or restart the pending fail-safe disable"
            )
        }
    }

    /// After the grace, a terminal failure fires the disable instead of postponing it.
    func testFailSafeDisableAction_FiresATerminalStatusAfterTheGrace() {
        for status in [URLFilterRawStatus.invalid, .stopped, .unknown] {
            XCTAssertEqual(
                URLFilterReconcileDecision.failSafeDisableAction(
                    observedStatus: status,
                    enabled: true,
                    hasPendingDisable: true,
                    hasElapsedGrace: true
                ),
                .fire,
                "\(status) must fire once the grace elapsed"
            )
        }
    }

    /// A transition defers the fire: the next terminal failure fires it.
    func testFailSafeDisableAction_DefersTheFireDuringTransitions() {
        for status in [URLFilterRawStatus.starting, .stopping] {
            XCTAssertEqual(
                URLFilterReconcileDecision.failSafeDisableAction(
                    observedStatus: status,
                    enabled: true,
                    hasPendingDisable: true,
                    hasElapsedGrace: true
                ),
                .keep,
                "\(status) must defer the fire"
            )
        }
    }

    func testFailSafeDisableAction_ClearsADisabledConfiguration() {
        XCTAssertEqual(
            URLFilterReconcileDecision.failSafeDisableAction(
                observedStatus: .invalid,
                enabled: false,
                hasPendingDisable: true,
                hasElapsedGrace: true
            ),
            .clear
        )
    }

    // MARK: isFailSafeFailureStatus

    func testIsFailSafeFailureStatus_ClassifiesTerminalFailuresOnly() {
        for status in [URLFilterRawStatus.invalid, .stopped, .unknown] {
            XCTAssertTrue(URLFilterReconcileDecision.isFailSafeFailureStatus(status))
        }
        for status in [URLFilterRawStatus.starting, .stopping, .running] {
            XCTAssertFalse(URLFilterReconcileDecision.isFailSafeFailureStatus(status))
        }
    }

    // MARK: resolveEnablePreconditions

    func testResolveEnablePreconditions_ResolvesConsistentSnapshots() {
        XCTAssertEqual(self.resolve(protection: (true, true), intent: (true, true), isPaid: true), .holds)
        XCTAssertEqual(self.resolve(protection: (false, false), intent: (true, true), isPaid: false), .fails)
        XCTAssertEqual(self.resolve(protection: (true, true), intent: (true, true), isPaid: false), .fails)
    }

    func testResolveEnablePreconditions_ReportsAChangedSnapshot() {
        XCTAssertEqual(self.resolve(protection: (true, false), intent: (true, true), isPaid: true), .changed)
        XCTAssertEqual(self.resolve(protection: (false, true), intent: (true, true), isPaid: true), .changed)
        XCTAssertEqual(self.resolve(protection: (true, true), intent: (true, false), isPaid: true), .changed)
    }

    /// Wraps `resolveEnablePreconditions` with `(before, after)` sample pairs.
    private func resolve(
        protection: (before: Bool, after: Bool),
        intent: (before: Bool, after: Bool),
        isPaid: Bool
    ) -> URLFilterReconcileDecision.EnablePreconditionOutcome {
        URLFilterReconcileDecision.resolveEnablePreconditions(
            protectionBefore: protection.before,
            intentBefore: intent.before,
            protectionAfter: protection.after,
            intentAfter: intent.after,
            isPaid: isPaid
        )
    }
}
