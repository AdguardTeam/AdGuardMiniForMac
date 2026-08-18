// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStateAssemblerTests.swift
//  AdguardMiniTests
//

import XCTest

private final class FakeURLFilterService: URLFilterService {
    var status: URLFilterStatus = .running
    var configuration: URLFilterConfiguration?

    func start() async {}
    func loadConfiguration() async throws -> URLFilterConfiguration? { self.configuration }
    func save(configuration _: URLFilterConfiguration) async throws {}
    func removeConfiguration() async throws {}
    func setEnabled(_: Bool) async throws {}
    func getStatus() async -> URLFilterStatus { self.status }
    func resetCache() async throws {}
}

private func makeAssembler(
    service: FakeURLFilterService,
    protectionLevel: URLFilterProtectionLevel = .essential,
    isNew: Bool = false,
    isPageNew: Bool = false,
    bloomMetadata: URLFilterBloomMetadata? = nil
) -> URLFilterStateAssembler {
    URLFilterStateAssembler(
        urlFilterService: service,
        protectionLevelProvider: { protectionLevel },
        isNewProvider: { isNew },
        isPageNewProvider: { isPageNew },
        bloomMetadataProvider: { bloomMetadata }
    )
}

final class URLFilterStateAssemblerTests: XCTestCase {
    // MARK: State assembly

    func testAssemblesRunningStateWithLevel() async {
        let service = FakeURLFilterService()
        service.status = .running
        service.configuration = URLFilterConfiguration(protectionLevel: .safe, enabled: true)
        let assembler = makeAssembler(service: service, protectionLevel: .safe, isPageNew: true)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .running)
        XCTAssertTrue(state.enabled)
        XCTAssertEqual(state.protectionLevel, .safe)
        XCTAssertFalse(state.isNew)
        XCTAssertTrue(state.isPageNew)
        XCTAssertFalse(state.info.isInstalling)
        XCTAssertNil(state.errorMessage)
    }

    func testErrorMessageSurfaced() async {
        let service = FakeURLFilterService()
        service.status = .stopped(errorMessage: "net down")
        let assembler = makeAssembler(service: service, isNew: true, isPageNew: true)

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .stopped(errorMessage: "net down"))
        XCTAssertEqual(state.errorMessage, "net down")
        XCTAssertFalse(state.enabled)
    }

    // MARK: Bloom metadata

    func testBloomMetadataPopulatesInfo() async {
        let service = FakeURLFilterService()
        service.status = .running
        let metadata = URLFilterBloomMetadata(
            rulesCount: 181_379,
            timeUpdated: Date(timeIntervalSince1970: 1_786_395_773),
            tag: "d88aef318f28"
        )
        let assembler = makeAssembler(service: service, bloomMetadata: metadata)

        let state = await assembler.makeState()

        XCTAssertEqual(state.info.rulesCount, 181_379)
        XCTAssertEqual(state.info.lastUpdate, Date(timeIntervalSince1970: 1_786_395_773))
        XCTAssertFalse(state.info.isInstalling)
    }

    func testAbsentBloomMetadataLeavesInfoFieldsNil() async {
        let service = FakeURLFilterService()
        service.status = .running
        let assembler = makeAssembler(service: service, bloomMetadata: nil)

        let state = await assembler.makeState()

        XCTAssertNil(state.info.rulesCount)
        XCTAssertNil(state.info.lastUpdate)
    }

    // MARK: Install flow

    func testIsInstallingTrueWhileStartingAfterInstallRequest() async {
        let service = FakeURLFilterService()
        service.status = .starting
        let assembler = makeAssembler(service: service, isNew: true, isPageNew: true)

        await assembler.markInstallRequested()
        let state = await assembler.makeState()

        XCTAssertTrue(state.info.isInstalling)
    }

    func testInstallFlagClearsOnceRunning() async {
        let service = FakeURLFilterService()
        service.status = .starting
        let assembler = makeAssembler(service: service, isNew: true, isPageNew: true)

        await assembler.markInstallRequested()
        service.status = .running
        let state = await assembler.makeState()

        XCTAssertFalse(state.info.isInstalling)
    }

    func testInstallFlagClearsOnInvalidStatus() async {
        let service = FakeURLFilterService()
        service.status = .starting
        let assembler = makeAssembler(service: service)

        await assembler.markInstallRequested()
        service.status = .invalid
        let state = await assembler.makeState()

        XCTAssertFalse(state.info.isInstalling)
        XCTAssertEqual(state.status, .invalid)
    }

    func testInstallFlagClearsOnStoppedStatus() async {
        let service = FakeURLFilterService()
        service.status = .starting
        let assembler = makeAssembler(service: service)

        await assembler.markInstallRequested()
        service.status = .stopped(errorMessage: "provider failed")
        let state = await assembler.makeState()

        XCTAssertFalse(state.info.isInstalling)
        XCTAssertEqual(state.status, .stopped(errorMessage: "provider failed"))
    }

    func testInstallFlagClearsOnDisabledStatus() async {
        // The user turned protection off on purpose — not a failure.
        let service = FakeURLFilterService()
        service.status = .starting
        let assembler = makeAssembler(service: service)

        await assembler.markInstallRequested()
        service.status = .disabled
        let state = await assembler.makeState()

        XCTAssertFalse(state.info.isInstalling)
        XCTAssertEqual(state.status, .disabled)
    }

    func testInstallFlagFalseOnFreshAssemblerWhileStarting() async {
        // Simulates an app restart: the flag lives only in memory (FR-006).
        let service = FakeURLFilterService()
        service.status = .starting
        let assembler = makeAssembler(service: service)

        let state = await assembler.makeState()

        XCTAssertFalse(state.info.isInstalling)
    }

    func testInstallFlagClearsOnConfigurationRemoval() async {
        let service = FakeURLFilterService()
        service.status = .starting
        let assembler = makeAssembler(service: service)

        await assembler.markInstallRequested()
        await assembler.markConfigurationRemoved()
        let state = await assembler.makeState()

        XCTAssertFalse(state.info.isInstalling)
    }
}
