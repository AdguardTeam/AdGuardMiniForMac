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

final class URLFilterStateAssemblerTests: XCTestCase {
    func testAssemblesRunningStateWithLevel() async {
        let service = FakeURLFilterService()
        service.status = .running
        service.configuration = URLFilterConfiguration(protectionLevel: .safe, enabled: true)
        let assembler = URLFilterStateAssembler(
            urlFilterService: service,
            protectionLevelProvider: { .safe },
            isNewProvider: { false },
            isPageNewProvider: { true }
        )

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
        let assembler = URLFilterStateAssembler(
            urlFilterService: service,
            protectionLevelProvider: { .essential },
            isNewProvider: { true },
            isPageNewProvider: { true }
        )

        let state = await assembler.makeState()

        XCTAssertEqual(state.status, .stopped(errorMessage: "net down"))
        XCTAssertEqual(state.errorMessage, "net down")
        XCTAssertFalse(state.enabled)
    }

    func testIsInstallingTrueWhileStartingAfterInstallRequest() async {
        let service = FakeURLFilterService()
        service.status = .starting
        let assembler = URLFilterStateAssembler(
            urlFilterService: service,
            protectionLevelProvider: { .essential },
            isNewProvider: { true },
            isPageNewProvider: { true }
        )

        await assembler.markInstallRequested()
        let state = await assembler.makeState()

        XCTAssertTrue(state.info.isInstalling)
    }

    func testInstallFlagClearsOnceRunning() async {
        let service = FakeURLFilterService()
        service.status = .starting
        let assembler = URLFilterStateAssembler(
            urlFilterService: service,
            protectionLevelProvider: { .essential },
            isNewProvider: { true },
            isPageNewProvider: { true }
        )

        await assembler.markInstallRequested()
        service.status = .running
        let state = await assembler.makeState()

        XCTAssertFalse(state.info.isInstalling)
    }
}
