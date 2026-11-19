// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LoginItemServiceTests.swift
//  AdguardMiniTests
//

import XCTest

/// Covers the login-item recovery loops with a scripted manager.
@MainActor
final class LoginItemServiceTests: XCTestCase {
    func testFirstAttemptEnabledDoesNotStartRecovery() {
        let manager = FakeLoginItemManager(initialStatus: .enabled)
        let service = self.makeService(manager).service

        XCTAssertTrue(service.tryRegisterHelper())
        XCTAssertEqual(manager.checkStatusCalls, 0)
    }

    func testRecoveryDoesNotReregisterEnabledHelper() async {
        let manager = FakeLoginItemManager(initialStatus: .notRegistered, statuses: [.enabled])
        let (service, spy) = self.makeService(manager)

        XCTAssertFalse(service.tryRegisterHelper())
        await self.waitUntil { spy.calls == 1 }

        XCTAssertEqual(manager.registerCalls, 0)
    }

    func testFailuresAreBoundedAndUnexpectedIsNotReset() async {
        let exhausted = FakeLoginItemManager(
            initialStatus: .notRegistered,
            statuses: [.notRegistered, .notRegistered],
            registerStatuses: [.notRegistered, .notRegistered]
        )
        let (exhaustedService, exhaustedSpy) = self.makeService(exhausted, maxAttempts: 3)

        XCTAssertFalse(exhaustedService.tryRegisterHelper())
        await self.waitUntil { exhausted.checkStatusCalls == 2 && exhausted.registerCalls == 2 }
        XCTAssertEqual(exhaustedSpy.calls, 0)

        let unexpected = FakeLoginItemManager(
            initialStatus: .unexpected("unknown"),
            statuses: [.unexpected("unknown")]
        )
        let (unexpectedService, unexpectedSpy) = self.makeService(unexpected, maxAttempts: 2)

        XCTAssertFalse(unexpectedService.tryRegisterHelper())
        await self.waitUntil { unexpected.checkStatusCalls == 1 }
        XCTAssertEqual(unexpected.registerCalls, 0)
        XCTAssertEqual(unexpectedSpy.calls, 0)
    }

    func testApprovalWatchReportsLateSuccess() async {
        let manager = FakeLoginItemManager(
            initialStatus: .requiresApproval,
            statuses: [.requiresApproval, .enabled]
        )
        let (service, spy) = self.makeService(manager)

        XCTAssertFalse(service.tryRegisterHelper())
        await self.waitUntil { spy.calls == 1 }

        XCTAssertEqual(manager.registerCalls, 0)
    }

    func testWatchRestartsRetryWhenHelperDisappears() async {
        let manager = FakeLoginItemManager(
            initialStatus: .requiresApproval,
            statuses: [.requiresApproval, .notRegistered, .notRegistered],
            registerStatuses: [.enabled]
        )
        let (service, spy) = self.makeService(manager)

        XCTAssertFalse(service.tryRegisterHelper())
        await self.waitUntil { spy.calls == 1 }

        XCTAssertEqual(manager.registerCalls, 1)
    }

    func testStopCancelsPendingRetry() async {
        let manager = FakeLoginItemManager(
            initialStatus: .notRegistered,
            statuses: [.notRegistered, .notRegistered]
        )
        let service = self.makeService(manager, baseDelaySeconds: 0.02).service

        XCTAssertFalse(service.tryRegisterHelper())
        await self.waitUntil { manager.registerCalls == 1 }
        service.stop()
        let callsAfterStop = manager.registerCalls

        try? await Task.sleep(seconds: 0.1)
        XCTAssertEqual(manager.registerCalls, callsAfterStop)
    }

    private func makeService(
        _ manager: FakeLoginItemManager,
        maxAttempts: Int = 5,
        baseDelaySeconds: TimeInterval = 0.001
    ) -> (service: LoginItemServiceImpl, spy: DelegateSpy) {
        let service = LoginItemServiceImpl(
            manager: manager,
            retryPolicy: RetryPolicy(maxAttempts: maxAttempts, baseDelaySeconds: baseDelaySeconds),
            approvalPollInterval: 0.001
        )
        let spy = DelegateSpy()
        service.delegate = spy
        return (service, spy)
    }

    private func waitUntil(
        file: StaticString = #filePath,
        line: UInt = #line,
        _ condition: @escaping @MainActor () -> Bool
    ) async {
        for _ in 0..<1000 {
            if condition() {
                return
            }
            try? await Task.sleep(seconds: 0.001)
        }
        XCTFail("Condition was not met", file: file, line: line)
    }
}

// MARK: - Test doubles

/// Returns scripted statuses and records the calls the service makes.
/// Test double; its state is used only from the main-actor test.
private final class FakeLoginItemManager: LoginItemManager, @unchecked Sendable {
    private let initialStatus: LoginItemManagerRegisterStatus
    private var statuses: [LoginItemManagerRegisterStatus]
    private var registerStatuses: [LoginItemManagerRegisterStatus]
    private(set) var checkStatusCalls = 0
    private(set) var registerCalls = 0

    init(
        initialStatus: LoginItemManagerRegisterStatus,
        statuses: [LoginItemManagerRegisterStatus] = [],
        registerStatuses: [LoginItemManagerRegisterStatus] = []
    ) {
        self.initialStatus = initialStatus
        self.statuses = statuses
        self.registerStatuses = registerStatuses
    }

    func checkAndRegisterHelper() -> LoginItemManagerRegisterStatus {
        self.initialStatus
    }

    func checkHelperStatus() -> LoginItemManagerRegisterStatus {
        self.checkStatusCalls += 1
        return self.statuses.isEmpty ? .notRegistered : self.statuses.removeFirst()
    }

    func registerHelper() -> LoginItemManagerRegisterStatus {
        self.registerCalls += 1
        return self.registerStatuses.isEmpty ? .notRegistered : self.registerStatuses.removeFirst()
    }
}

/// Records late-success callbacks.
@MainActor
private final class DelegateSpy: LoginItemServiceDelegate {
    private(set) var calls = 0

    func registrationSuccessful() {
        self.calls += 1
    }
}
