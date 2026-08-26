// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStateAssemblerTests.swift
//  AdguardMiniTests
//

import XCTest

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

private final class FakeURLFilterService: URLFilterService {
    var state = makeState()
    var getStateError: Error?

    func start() async {}
    func loadConfiguration() async throws -> URLFilterConfiguration? { nil }
    func removeConfiguration() async throws {}
    func setEnabled(_: Bool) async throws {}
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

private func makeAssembler(
    service: FakeURLFilterService,
    protectionLevel: URLFilterProtectionLevel = .essential,
    isNew: Bool = false,
    bloomMetadata: URLFilterBloomMetadata? = nil
) -> URLFilterStateAssembler {
    URLFilterStateAssembler(
        urlFilterService: service,
        protectionLevelProvider: { protectionLevel },
        isNewProvider: { isNew },
        bloomMetadataProvider: { bloomMetadata }
    )
}

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

    func testDisabledWithInvalidStatusAndErrorStaysLoading() async {
        let service = FakeURLFilterService()
        service.state = makeState(
            enabled: false,
            status: .invalid,
            lastDisconnectError: .extensionFailedToLoad
        )
        let assembler = makeAssembler(service: service)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .loading)
        XCTAssertFalse(state.enabled)
    }

    func testStateFetchFailureMapsToError() async {
        let service = FakeURLFilterService()
        service.getStateError = FakeError.stateUnavailable
        let assembler = makeAssembler(service: service)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .error)
        XCTAssertFalse(state.enabled)
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
}
