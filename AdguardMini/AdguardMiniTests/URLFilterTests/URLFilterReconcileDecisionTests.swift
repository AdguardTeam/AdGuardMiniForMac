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
