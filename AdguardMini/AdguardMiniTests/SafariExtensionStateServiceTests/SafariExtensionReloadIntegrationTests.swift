// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensionReloadIntegrationTests.swift
//  AdguardMiniTests
//

import AML
import XCTest

/// Wires the real `SafariExtensionManagerImpl` retry loop in front of
/// `SafariExtensionStateServiceImpl` (behavioral `ReloadExtensionDelegate`) and
/// asserts the UI-status contract:
/// - a reload that fails then recovers via retry ends loaded with no permanent
///   `.safariError`;
/// - a reload failing on every attempt ends `.safariError` through the existing
///   `onEndReload` -> `SafariExtensionStateServiceImpl.updateInfo` path;
/// - a cancellation abort only clears the in-progress flag and preserves a
///   previously stored `.safariError`.
final class SafariExtensionReloadIntegrationTests: XCTestCase {
    /// Everything the tests drive: the real manager, the real state service
    /// acting as its delegate, and the controllable fake reload API.
    private struct Wiring {
        let manager: SafariExtensionManagerImpl
        let service: SafariExtensionStateServiceImpl
        let fake: FakeSafariReload
    }

    private typealias StatusManagerMock = SafariExtensionStatusManagerMock.MockType
    private typealias StorageMock = SafariExtensionStateStorageMock.MockType

    private func makeWiring(
        failuresBeforeSuccess: Int?,
        clock: RecordingClock
    ) -> Wiring {
        let fake = FakeSafariReload(failuresBeforeSuccess: failuresBeforeSuccess)
        let service = SafariExtensionStateServiceImpl(
            eventBus: EventBusMock(),
            safariExtensionStatusManager: StatusManagerMock.extEnabled.createObject(),
            safariExtensionStateStorage: StorageMock.updateSuccess.createObject()
        )
        let manager = SafariExtensionManagerImpl(
            delegate: service,
            safariPopupApiClient: SafariPopupApiStub(),
            sleep: { try await clock.sleep($0) },
            reloadBlocker: { _ in try await fake.reload() }
        ) { _ in }
        return Wiring(manager: manager, service: service, fake: fake)
    }

    private func makeWiringWithManualClock(
        failuresBeforeSuccess: Int?,
        clock: ManualSleepClock,
        initialState: [SafariBlockerType: SafariExtension.State] = [:]
    ) -> Wiring {
        let fake = FakeSafariReload(failuresBeforeSuccess: failuresBeforeSuccess)
        let service = SafariExtensionStateServiceImpl(
            eventBus: EventBusMock(),
            safariExtensionStatusManager: StatusManagerMock.extEnabled.createObject(),
            safariExtensionStateStorage: SafariExtensionStateStorageMock(
                stateHolder: initialState,
                configuration: SafariExtensionStateStorageMock.Configuration(
                    isUpdateSucceed: true
                )
            )
        )
        let manager = SafariExtensionManagerImpl(
            delegate: service,
            safariPopupApiClient: SafariPopupApiStub(),
            sleep: { try await clock.sleep($0) },
            reloadBlocker: { _ in try await fake.reload() }
        ) { _ in }
        return Wiring(manager: manager, service: service, fake: fake)
    }

    /// A state with a persisted `.safariError` and otherwise neutral rules info.
    private static func makeSafariErrorState() -> SafariExtension.State {
        SafariExtension.State(
            rulesInfo: ConversionInfo(
                sourceRulesCount: 0,
                sourceSafariCompatibleRulesCount: 0,
                safariRulesCount: 0,
                advancedRulesCount: 0,
                discardedSafariRules: 0,
                advancedRulesText: nil,
                errorsCount: 0
            ),
            error: .safariError("stale")
        )
    }

    /// A reload that fails once and recovers on the retry ends loaded with no
    /// permanent `.safariError`.
    func testFailedThenRetriedReloadEndsLoadedWithoutSafariError() async {
        let clock = RecordingClock()
        let wiring = self.makeWiring(failuresBeforeSuccess: 1, clock: clock)

        let result = await wiring.manager.reloadContentBlocker(.general)

        XCTAssertTrue(result)
        let statuses = await wiring.service.getAllExtensionsStatus()
        XCTAssertEqual(statuses.general.status, .ok)
        XCTAssertNil(statuses.general.state.error)
    }

    /// Every attempt failing ends with the blocker reported as `.safariError`
    /// via `onEndReload` -> `updateInfo`.
    func testEveryAttemptFailingEndsWithSafariError() async {
        let clock = RecordingClock()
        let wiring = self.makeWiring(failuresBeforeSuccess: nil, clock: clock)

        let result = await wiring.manager.reloadContentBlocker(.general)

        XCTAssertFalse(result)
        let attempts = await wiring.fake.attemptCount
        XCTAssertEqual(attempts, 3)
        let statuses = await wiring.service.getAllExtensionsStatus()
        XCTAssertEqual(statuses.general.status, .safariError)
        guard case .safariError? = statuses.general.state.error else {
            XCTFail(
                "Expected a safariError, got " +
                "\(String(describing: statuses.general.state.error))"
            )
            return
        }
    }

    /// A cancellation abort only clears the in-progress flag: the previously
    /// stored `.safariError` survives because no actual Safari reload happened.
    func testCancellationAbortPreservesStoredSafariError() async {
        let clock = ManualSleepClock()
        let wiring = self.makeWiringWithManualClock(
            failuresBeforeSuccess: nil,
            clock: clock,
            initialState: [.general: Self.makeSafariErrorState()]
        )

        let operation = Task { await wiring.manager.reloadContentBlocker(.general) }
        await clock.waitForNextSleep()

        operation.cancel()
        let result = await operation.value

        XCTAssertFalse(result)
        let statuses = await wiring.service.getAllExtensionsStatus()
        XCTAssertEqual(statuses.general.status, .safariError)
        guard case .safariError? = statuses.general.state.error else {
            XCTFail(
                "Expected the stored safariError to survive the abort, got " +
                "\(String(describing: statuses.general.state.error))"
            )
            return
        }
    }
}
