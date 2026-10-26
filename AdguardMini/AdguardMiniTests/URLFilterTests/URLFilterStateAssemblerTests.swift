// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStateAssemblerTests.swift
//  AdguardMiniTests
//

import XCTest
import AML

/// Builds a ``URLFilterState`` with readable defaults so tests only
/// override the fields they care about.
private func makeState(
    enabled: Bool = true,
    status: URLFilterRawStatus = .running,
    serverURL: URL? = URL(string: "https://server.example"),
    issuerURL: URL? = URL(string: "https://issuer.example"),
    lastDisconnectError: URLFilterError? = nil
) -> URLFilterState {
    URLFilterState(
        enabled: enabled,
        status: status,
        serverURL: serverURL,
        issuerURL: issuerURL,
        lastDisconnectError: lastDisconnectError
    )
}

/// `@unchecked Sendable` because the double is driven single-threaded by one
/// test.
private final class FakeURLFilterService: URLFilterService, @unchecked Sendable {
    var state = makeState()
    var getStateError: Error?
    var isFilterInstalled = false

    func start() async {}
    func refreshInstalledState() async {}
    func loadConfiguration() async throws -> URLFilterConfiguration? { nil }
    func removeConfiguration() async throws {}
    func setEnabledByUser(_: Bool) async throws {}
    func reconcile() async {}
    func retryIfNeeded() async {}
    func setProtectionLevel(_: URLFilterProtectionLevel) async throws {}
    func getState() async throws -> URLFilterState {
        if let error = self.getStateError {
            throw error
        }
        return self.state
    }
    func resetCache() async throws {}
}

private enum FakeError: Error {
    case stateUnavailable
}

/// Answers the assembler with a preconfigured blockage verdict and records how
/// often it was consulted.
private final class FakeICloudDomainBlockageChecker: ICloudDomainBlockageChecking, @unchecked Sendable {
    private let lock = UnfairLock()
    private var storedIsBlocked = false
    private var storedCallCount = 0

    /// Whether the checker reports a blocked iCloud domain.
    var isBlocked: Bool {
        get { locked(self.lock) { self.storedIsBlocked } }
        set { locked(self.lock) { self.storedIsBlocked = newValue } }
    }

    /// Number of times `isAnyDomainBlocked()` was called.
    var callCount: Int {
        locked(self.lock) { self.storedCallCount }
    }

    func isAnyDomainBlocked() async -> Bool {
        locked(self.lock) {
            self.storedCallCount += 1
            return self.storedIsBlocked
        }
    }
}

private func makeAssembler(
    service: FakeURLFilterService,
    protectionLevel: URLFilterProtectionLevel = .essential,
    bloomMetadata: URLFilterBloomMetadata? = nil,
    checker: FakeICloudDomainBlockageChecker = FakeICloudDomainBlockageChecker(),
    userIntent: Bool = true
) -> URLFilterStateAssembler {
    URLFilterStateAssembler(
        urlFilterService: service,
        protectionLevelProvider: { protectionLevel },
        bloomMetadataProvider: { bloomMetadata },
        userIntentProvider: { userIntent },
        iCloudDomainBlockageChecker: checker
    )
}

/// `@MainActor` because the code under test is main-actor isolated.
@MainActor
final class URLFilterStateAssemblerTests: XCTestCase {
    // MARK: State assembly

    func testRunningStatusAssemblesRunningAndEnabled() async {
        let service = FakeURLFilterService()
        service.state = makeState(status: .running)
        let assembler = makeAssembler(service: service, protectionLevel: .safe)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .running)
        XCTAssertTrue(state.enabled)
        XCTAssertEqual(state.protectionLevel, .safe)
    }

    func testStartingAndStoppingMapToLoading() async {
        let service = FakeURLFilterService()
        let assembler = makeAssembler(service: service)

        service.state = makeState(status: .starting)
        var state = await assembler.makeState()
        XCTAssertEqual(state.status, .loading)

        service.state = makeState(status: .stopping)
        state = await assembler.makeState()
        XCTAssertEqual(state.status, .loading)
    }

    func testStoppedWithoutErrorMapsToLoading() async {
        let service = FakeURLFilterService()
        service.state = makeState(status: .stopped, lastDisconnectError: nil)
        let assembler = makeAssembler(service: service)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .loading)
    }

    func testStoppedWithDisconnectErrorMapsToErrorAndDisables() async {
        let service = FakeURLFilterService()
        service.state = makeState(status: .stopped, lastDisconnectError: .configurationDisabled)
        let assembler = makeAssembler(service: service)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .error)
        XCTAssertFalse(state.enabled)
    }

    func testErrorStatusWithBlockedICloudDomainsMapsToDNSError() async {
        let service = FakeURLFilterService()
        service.state = makeState(status: .stopped, lastDisconnectError: .serverSetupIncomplete)
        let checker = FakeICloudDomainBlockageChecker()
        checker.isBlocked = true
        let assembler = makeAssembler(service: service, checker: checker)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .dnsError)
        XCTAssertFalse(state.enabled)
        XCTAssertEqual(checker.callCount, 1)
    }

    func testErrorStatusWithUnblockedICloudDomainsStaysError() async {
        let service = FakeURLFilterService()
        service.state = makeState(status: .stopped, lastDisconnectError: .serverSetupIncomplete)
        let checker = FakeICloudDomainBlockageChecker()
        checker.isBlocked = false
        let assembler = makeAssembler(service: service, checker: checker)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .error)
        XCTAssertFalse(state.enabled)
        XCTAssertEqual(checker.callCount, 1)
    }

    func testOtherErrorKindsDoNotConsultICloudChecker() async {
        let service = FakeURLFilterService()
        service.state = makeState(status: .stopped, lastDisconnectError: .configurationDisabled)
        let checker = FakeICloudDomainBlockageChecker()
        checker.isBlocked = true
        let assembler = makeAssembler(service: service, checker: checker)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .error)
        XCTAssertFalse(state.enabled)
        XCTAssertEqual(checker.callCount, 0)
    }

    func testNonErrorStatusesDoNotConsultICloudChecker() async {
        let service = FakeURLFilterService()
        let checker = FakeICloudDomainBlockageChecker()
        let assembler = makeAssembler(service: service, checker: checker)

        service.state = makeState(status: .running)
        var state = await assembler.makeState()
        XCTAssertEqual(state.status, .running)

        service.state = makeState(status: .starting)
        state = await assembler.makeState()
        XCTAssertEqual(state.status, .loading)

        XCTAssertEqual(checker.callCount, 0)
    }

    func testDisabledStoppedWithErrorAndIntentOnMapsToError() async {
        let service = FakeURLFilterService()
        service.state = makeState(
            enabled: false,
            status: .stopped,
            lastDisconnectError: .configurationDisabled
        )
        let assembler = makeAssembler(service: service, userIntent: true)

        let state = await assembler.makeState()

        // A filter disabled after a failure keeps the failure while the user still wants it on.
        XCTAssertEqual(state.status, .error)
        XCTAssertFalse(state.enabled)
    }

    func testDisabledStoppedWithErrorAndIntentOffStaysLoading() async {
        let service = FakeURLFilterService()
        service.state = makeState(
            enabled: false,
            status: .stopped,
            lastDisconnectError: .configurationDisabled
        )
        let assembler = makeAssembler(service: service, userIntent: false)

        let state = await assembler.makeState()

        // The user turned the filter off: no failure is surfaced.
        XCTAssertEqual(state.status, .loading)
        XCTAssertFalse(state.enabled)
    }

    func testInvalidAndUnknownWithoutErrorMapToLoading() async {
        let service = FakeURLFilterService()
        let assembler = makeAssembler(service: service)

        service.state = makeState(status: .invalid)
        var state = await assembler.makeState()
        XCTAssertEqual(state.status, .loading)
        XCTAssertTrue(state.enabled)

        service.state = makeState(status: .unknown)
        state = await assembler.makeState()
        XCTAssertEqual(state.status, .loading)
    }

    func testEnabledInvalidWithDisconnectErrorMapsToError() async {
        let service = FakeURLFilterService()
        service.state = makeState(status: .invalid, lastDisconnectError: .extensionFailedToLoad)
        let assembler = makeAssembler(service: service)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .error)
        XCTAssertFalse(state.enabled)
    }

    func testDisabledWithInvalidStatusDoesNotSurfaceError() async {
        let service = FakeURLFilterService()
        service.state = makeState(enabled: false, status: .invalid)
        let assembler = makeAssembler(service: service)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .loading)
        XCTAssertFalse(state.enabled)
    }

    func testDisabledWithErrorAndIntentOnMapsToError() async {
        let service = FakeURLFilterService()
        service.state = makeState(
            enabled: false,
            status: .invalid,
            lastDisconnectError: .extensionFailedToLoad
        )
        let assembler = makeAssembler(service: service, userIntent: true)

        let state = await assembler.makeState()

        // The fail-safe disabled the filter, but the user still wants it on: the switch stays inactive.
        XCTAssertEqual(state.status, .error)
        XCTAssertFalse(state.enabled)
        XCTAssertTrue(state.userIntentEnabled)
    }

    func testDisabledWithErrorAndIntentOffStaysLoading() async {
        let service = FakeURLFilterService()
        service.state = makeState(
            enabled: false,
            status: .invalid,
            lastDisconnectError: .extensionFailedToLoad
        )
        let assembler = makeAssembler(service: service, userIntent: false)

        let state = await assembler.makeState()

        // The user turned the filter off: no failure is surfaced.
        XCTAssertEqual(state.status, .loading)
        XCTAssertFalse(state.enabled)
        XCTAssertFalse(state.userIntentEnabled)
    }

    func testFailSafeDisabledFilterWithBlockedICloudDomainsStaysDNSError() async {
        let service = FakeURLFilterService()
        service.state = makeState(
            enabled: false,
            status: .invalid,
            lastDisconnectError: .serverSetupIncomplete
        )
        let checker = FakeICloudDomainBlockageChecker()
        checker.isBlocked = true
        let assembler = makeAssembler(service: service, checker: checker, userIntent: true)

        let state = await assembler.makeState()

        // The fail-safe disable must not hide the iCloud failure: the card and the switch state survive it.
        XCTAssertEqual(state.status, .dnsError)
        XCTAssertFalse(state.enabled)
        XCTAssertTrue(state.userIntentEnabled)
    }

    func testAssemblesTheUserIntentForTheSwitch() async {
        let service = FakeURLFilterService()

        let onState = await makeAssembler(service: service, userIntent: true).makeState()
        XCTAssertTrue(onState.userIntentEnabled)

        let offState = await makeAssembler(service: service, userIntent: false).makeState()
        XCTAssertFalse(offState.userIntentEnabled)
    }

    func testStateFetchFailureMapsToError() async {
        let service = FakeURLFilterService()
        service.getStateError = FakeError.stateUnavailable
        let checker = FakeICloudDomainBlockageChecker()
        let assembler = makeAssembler(service: service, checker: checker)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .error)
        XCTAssertFalse(state.enabled)
        XCTAssertEqual(checker.callCount, 0)
    }

    // MARK: Installation state

    func testIsInstalledWhenServerAndIssuerURLsAreSet() async {
        let service = FakeURLFilterService()
        service.state = makeState(
            serverURL: URL(string: "https://server.example"),
            issuerURL: URL(string: "https://issuer.example")
        )
        let assembler = makeAssembler(service: service)

        let state = await assembler.makeState()

        XCTAssertTrue(state.isInstalled)
    }

    func testNotInstalledWhenServerURLIsMissing() async {
        let service = FakeURLFilterService()
        service.state = makeState(serverURL: nil)
        let assembler = makeAssembler(service: service)

        let state = await assembler.makeState()

        XCTAssertFalse(state.isInstalled)
    }

    func testInstalledWhenOnlyServerURLIsSet() async {
        let service = FakeURLFilterService()
        service.state = makeState(issuerURL: nil)
        let assembler = makeAssembler(service: service)

        let state = await assembler.makeState()

        XCTAssertTrue(state.isInstalled)
    }

    // MARK: Bloom metadata

    func testBloomMetadataPopulatesInfo() async {
        let service = FakeURLFilterService()
        service.state = makeState(status: .running)
        let metadata = URLFilterBloomMetadata(
            rulesCount: 181_379,
            timeUpdated: Date(timeIntervalSince1970: 1_786_395_773),
            tag: "d88aef318f28"
        )
        let assembler = makeAssembler(service: service, bloomMetadata: metadata)

        let state = await assembler.makeState()

        XCTAssertEqual(state.info.rulesCount, 181_379)
        XCTAssertEqual(state.info.lastUpdate, Date(timeIntervalSince1970: 1_786_395_773))
    }

    func testAbsentBloomMetadataLeavesInfoFieldsNil() async {
        let service = FakeURLFilterService()
        service.state = makeState(status: .running)
        let assembler = makeAssembler(service: service, bloomMetadata: nil)

        let state = await assembler.makeState()

        XCTAssertNil(state.info.rulesCount)
        XCTAssertNil(state.info.lastUpdate)
    }

    // MARK: Installed state resolver

    func testInstalledStateResolverReportsTheVisibleState() {
        XCTAssertFalse(
            URLFilterInstalledStateResolver.isInstalled(
                cachedState: nil,
                settledState: nil,
                isPublishingSuspended: false
            )
        )
        XCTAssertTrue(
            URLFilterInstalledStateResolver.isInstalled(
                cachedState: makeState(),
                settledState: nil,
                isPublishingSuspended: false
            )
        )
        XCTAssertFalse(
            URLFilterInstalledStateResolver.isInstalled(
                cachedState: makeState(),
                settledState: makeState(serverURL: nil),
                isPublishingSuspended: true
            )
        )
        XCTAssertTrue(
            URLFilterInstalledStateResolver.isInstalled(
                cachedState: makeState(serverURL: nil),
                settledState: makeState(),
                isPublishingSuspended: true
            )
        )
    }
}
