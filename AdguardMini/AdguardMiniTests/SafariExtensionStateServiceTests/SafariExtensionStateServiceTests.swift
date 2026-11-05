// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensionStateServiceTests.swift
//  AdguardMiniTests
//

import XCTest

/// `@MainActor` because the code under test is main-actor isolated.
@MainActor
final class SafariExtensionStateServiceTests: XCTestCase {
    private func checkOnStartConversion(
        _ blockerType: SafariBlockerType,
        _ testCase: TestCase,
        _ stateService: SafariExtensionStateService,
        _ callbackService: EventBusMock,
        _ exp: XCTestExpectation = .init(description: "Check On Start Conversion"),
        _ line: UInt = #line
    ) async {
        callbackService.prepareWaiting {
            Task {
                await stateService.onStartConversion(blockerType: blockerType)
            }
        }
        callbackService.waitUpdate { _ in
            exp.fulfill()
        }

        await fulfillment(of: [exp], timeout: 5)

        let expected = CurrentExtensionState.loadingStatus(blockerType)
        let actual = callbackService.lastUpdate!

        XCTAssertEqual(
            expected,
            actual,
            line: line
        )
    }

    private func checkOnEndConversion(
        _ blockerType: SafariBlockerType,
        _ testCase: TestCase,
        _ stateService: SafariExtensionStateService,
        _ callbackService: EventBusMock,
        _ exp: XCTestExpectation = .init(description: "Check On End Conversion"),
        _ line: UInt = #line
    ) async {
        callbackService.prepareWaiting {
            Task {
                await stateService.onEndConversion(testCase.createConversionResult(blockerType: blockerType))
            }
        }
        callbackService.waitUpdate { _ in
            exp.fulfill()
        }

        await fulfillment(of: [exp], timeout: 5)

        let expected = testCase.createExpectedUpdate(blockerType, ignoreReloadStatus: true)
        let actual = callbackService.lastUpdate!

        XCTAssertEqual(
            expected,
            actual,
            """

            Test failed (\(#function))
            Test case: \(testCase)
            Expected: \(expected)
            Actual: \(actual)
            """,
            line: line
        )
    }

    private func checkOnStartReload(
        _ blockerType: SafariBlockerType,
        _ testCase: TestCase,
        _ stateService: SafariExtensionStateService,
        _ callbackService: EventBusMock,
        _ exp: XCTestExpectation = .init(description: "Check On Start Reload"),
        _ line: UInt = #line
    ) async {
        callbackService.prepareWaiting {
            Task {
                await stateService.onStartReload(blockerType: blockerType)
            }
        }
        callbackService.waitUpdate { _ in
            exp.fulfill()
        }

        await fulfillment(of: [exp], timeout: 5)

        let expected = CurrentExtensionState.loadingStatus(blockerType)
        let actual = callbackService.lastUpdate!

        XCTAssertEqual(
            expected,
            actual,
            line: line
        )
    }

    private func checkOnEndReload(
        _ blockerType: SafariBlockerType,
        _ testCase: TestCase,
        _ stateService: SafariExtensionStateService,
        _ callbackService: EventBusMock,
        _ exp: XCTestExpectation = .init(description: "Check On End Reload"),
        _ line: UInt = #line
    ) async {
        callbackService.prepareWaiting {
            Task {
                await stateService.onEndReload(testCase.createReloadResult(blockerType: blockerType))
            }
        }
        callbackService.waitUpdate { _ in
            exp.fulfill()
        }

        await fulfillment(of: [exp], timeout: 5)

        let expected = testCase.createExpectedUpdate(blockerType)
        let actual = callbackService.lastUpdate!

        XCTAssertEqual(
            expected,
            actual,
            """

            Test failed (\(#function))
            Test case: \(testCase)
            Expected: \(expected)
            Actual: \(actual)
            """,
            line: line
        )
    }

    func testGoodConversion1() async throws {
        let testCase = TestCase.conversionSucceed(.extEnabled_ReloadSucceed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testGoodConversion2() async throws {
        let testCase = TestCase.conversionSucceed(.extEnabled_ReloadSucceed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testGoodConversion3() async throws {
        let testCase = TestCase.conversionSucceed(.extNotEnabled_ReloadSucceed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testGoodConversion4() async throws {
        let testCase = TestCase.conversionSucceed(.extNotEnabled_ReloadSucceed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testGoodConversion5() async throws {
        let testCase = TestCase.conversionSucceed(.extEnabled_ReloadFailed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testGoodConversion6() async throws {
        let testCase = TestCase.conversionSucceed(.extEnabled_ReloadFailed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testGoodConversion7() async throws {
        let testCase = TestCase.conversionSucceed(.extNotEnabled_ReloadFailed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testGoodConversion8() async throws {
        let testCase = TestCase.conversionSucceed(.extNotEnabled_ReloadFailed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testOverLimitConversion1() async throws {
        let testCase = TestCase.conversionSucceedOverLimit(.extEnabled_ReloadSucceed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testOverLimitConversion2() async throws {
        let testCase = TestCase.conversionSucceedOverLimit(.extEnabled_ReloadSucceed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testOverLimitConversion3() async throws {
        let testCase = TestCase.conversionSucceedOverLimit(.extNotEnabled_ReloadSucceed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testOverLimitConversion4() async throws {
        let testCase = TestCase.conversionSucceedOverLimit(.extNotEnabled_ReloadSucceed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testOverLimitConversion5() async throws {
        let testCase = TestCase.conversionSucceedOverLimit(.extEnabled_ReloadFailed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testOverLimitConversion6() async throws {
        let testCase = TestCase.conversionSucceedOverLimit(.extEnabled_ReloadFailed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testOverLimitConversion7() async throws {
        let testCase = TestCase.conversionSucceedOverLimit(.extNotEnabled_ReloadFailed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testOverLimitConversion8() async throws {
        let testCase = TestCase.conversionSucceedOverLimit(.extNotEnabled_ReloadFailed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testFailedConversion1() async throws {
        let testCase = TestCase.conversionFailed(.extEnabled_ReloadSucceed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testFailedConversion2() async throws {
        let testCase = TestCase.conversionFailed(.extEnabled_ReloadSucceed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testFailedConversion3() async throws {
        let testCase = TestCase.conversionFailed(.extNotEnabled_ReloadSucceed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testFailedConversion4() async throws {
        let testCase = TestCase.conversionFailed(.extNotEnabled_ReloadSucceed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testFailedConversion5() async throws {
        let testCase = TestCase.conversionFailed(.extEnabled_ReloadFailed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testFailedConversion6() async throws {
        let testCase = TestCase.conversionFailed(.extEnabled_ReloadFailed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testFailedConversion7() async throws {
        let testCase = TestCase.conversionFailed(.extNotEnabled_ReloadFailed_UpdateSuccess)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testFailedConversion8() async throws {
        let testCase = TestCase.conversionFailed(.extNotEnabled_ReloadFailed_UpdateFailed)
        let (stateService, callbackService) = testCase.createTestClasses()
        let blockerType = SafariBlockerType.general

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testFailedReloadSucceededReload1() async throws {
        let blockerType = SafariBlockerType.general
        var testCase = TestCase.conversionSucceed(.extEnabled_ReloadFailed_UpdateSuccess)

        let callbackService = EventBusMock()
        let statusManager = ManagerMockType.extEnabled.createObject()
        let stateStorage = StorageMockType.updateSuccess.createObject()
        let stateService = SafariExtensionStateServiceImpl(
            eventBus: callbackService,
            safariExtensionStatusManager: statusManager,
            safariExtensionStateStorage: stateStorage
        )

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)

        testCase = TestCase.conversionSucceed(.extEnabled_ReloadSucceed_UpdateSuccess)

        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    func testFailedReloadSucceededReload2() async throws {
        let blockerType = SafariBlockerType.general
        var testCase = TestCase.conversionFailed(.extEnabled_ReloadFailed_UpdateSuccess)

        let callbackService = EventBusMock()
        let statusManager = ManagerMockType.extEnabled.createObject()
        let stateStorage = StorageMockType.updateSuccess.createObject()
        let stateService = SafariExtensionStateServiceImpl(
            eventBus: callbackService,
            safariExtensionStatusManager: statusManager,
            safariExtensionStateStorage: stateStorage
        )

        await self.checkOnStartConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndConversion(blockerType, testCase, stateService, callbackService)
        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)

        testCase = TestCase.conversionFailed(.extEnabled_ReloadSucceed_UpdateSuccess)

        await self.checkOnStartReload(blockerType, testCase, stateService, callbackService)
        await self.checkOnEndReload(blockerType, testCase, stateService, callbackService)
    }

    /// A cancelled conversion produced no rules and must keep the stored state
    /// instead of recording a converter error for the interrupted update.
    func testCancelledConversionKeepsStoredState() async {
        let blockerType = SafariBlockerType.general
        let storedInfo = ConversionInfo(
            sourceRulesCount: 100,
            sourceSafariCompatibleRulesCount: 100,
            safariRulesCount: 100,
            advancedRulesCount: 0,
            discardedSafariRules: 0,
            advancedRulesText: nil,
            errorsCount: 0
        )
        let storedState = SafariExtension.State(rulesInfo: storedInfo, error: .safariError("stored"))
        let stateStorage = SafariExtensionStateStorageMock(
            stateHolder: [blockerType: storedState],
            configuration: .init(isUpdateSucceed: true)
        )
        let callbackService = EventBusMock()
        let stateService = SafariExtensionStateServiceImpl(
            eventBus: callbackService,
            safariExtensionStatusManager: ManagerMockType.extEnabled.createObject(),
            safariExtensionStateStorage: stateStorage
        )

        await stateService.onEndConversion(
            SafariConversionResult(
                blockerType: blockerType,
                conversionInfo: .failure(.cancelled)
            )
        )

        XCTAssertEqual(stateStorage.getState(blockerType), storedState)
        XCTAssertEqual(callbackService.lastUpdate.status, .safariError)
    }
}
