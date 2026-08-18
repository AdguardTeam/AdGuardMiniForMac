// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterResetServiceTests.swift
//  AdguardMiniTests
//

import XCTest

// MARK: - Fakes

private final class FakeURLFilterService: URLFilterService {
    var status: URLFilterStatus = .running
    var removeConfigurationError: Error?
    var removeConfigurationCalls = 0

    func start() async {}
    func loadConfiguration() async throws -> URLFilterConfiguration? { nil }
    func save(configuration _: URLFilterConfiguration) async throws {}
    func removeConfiguration() async throws {
        self.removeConfigurationCalls += 1
        if let error = self.removeConfigurationError {
            throw error
        }
    }
    func setEnabled(_: Bool) async throws {}
    func getStatus() async -> URLFilterStatus { self.status }
    func resetCache() async throws {}
}

private final class FakeKeychainStorage: SharedKeychainStorage {
    var urlFilterEnabled = false
    var urlFilterProtectionLevelOption = 0
    var resetCalls = 0

    func reset() {
        self.resetCalls += 1
    }
}

private final class FakeBloomMetadataStorage: URLFilterBloomMetadataStorage {
    private var metadata: URLFilterBloomMetadata?
    var removeCalls = 0

    func load() -> URLFilterBloomMetadata? { self.metadata }
    func save(_ metadata: URLFilterBloomMetadata) { self.metadata = metadata }
    func remove() {
        self.metadata = nil
        self.removeCalls += 1
    }
}

private final class FakeGroupFolderFileService: GroupFolderFileService {
    var fileExists = false
    var removeFileCalls = 0

    var originDir: URL { URL(fileURLWithPath: "/fake") }

    func saveFile(data _: Data, relativePath _: String, fileExtension _: String?) async -> Bool { true }
    func loadFile(relativePath _: String, fileExtension _: String?) async -> Data? { nil }

    func removeFile(relativePath _: String, fileExtension _: String?) async -> Bool {
        self.removeFileCalls += 1
        return true
    }

    func isFileExists(relativePath _: String, fileExtension _: String?) async -> Bool { self.fileExists }
    func isDirectoryNotEmpty(relativePath _: String) async -> Bool { false }

    func buildUrl(relativePath: String, with fileExtension: String?) -> URL {
        var url = self.originDir.appendingPathComponent(relativePath)
        if let fileExtension {
            url.appendPathExtension(fileExtension)
        }
        return url
    }
}

private enum TestError: Error {
    case generic
}

// MARK: - Test helpers

private func makeResetService(
    urlFilterService: FakeURLFilterService,
    keychainStorage: FakeKeychainStorage,
    bloomMetadataStorage: FakeBloomMetadataStorage,
    fileService: FakeGroupFolderFileService
) -> (URLFilterResetService, URLFilterStateAssembler) {
    let assembler = URLFilterStateAssembler(
        urlFilterService: urlFilterService,
        protectionLevelProvider: { .essential },
        isNewProvider: { false },
        isPageNewProvider: { false },
        bloomMetadataProvider: { nil }
    )
    let resetService = URLFilterResetServiceImpl(
        urlFilterService,
        keychainStorage,
        bloomMetadataStorage,
        fileService,
        assembler
    )
    return (resetService, assembler)
}

// MARK: - URLFilterResetServiceTests

final class URLFilterResetServiceTests: XCTestCase {
    func testSuccessfulResetClearsAllLocalState() async {
        let urlFilterService = FakeURLFilterService()
        let keychainStorage = FakeKeychainStorage()
        let bloomMetadataStorage = FakeBloomMetadataStorage()
        bloomMetadataStorage.save(URLFilterBloomMetadata(rulesCount: 10, timeUpdated: .now, tag: "tag"))
        let fileService = FakeGroupFolderFileService()
        fileService.fileExists = true
        let (resetService, _) = makeResetService(
            urlFilterService: urlFilterService,
            keychainStorage: keychainStorage,
            bloomMetadataStorage: bloomMetadataStorage,
            fileService: fileService
        )

        let error = await resetService.reset()

        XCTAssertNil(error)
        XCTAssertEqual(urlFilterService.removeConfigurationCalls, 1)
        XCTAssertEqual(keychainStorage.resetCalls, 1)
        XCTAssertEqual(bloomMetadataStorage.removeCalls, 1)
        XCTAssertNil(bloomMetadataStorage.load())
        XCTAssertEqual(fileService.removeFileCalls, 1)
    }

    func testUnsupportedPlatformIsTreatedAsSuccessfulNoOp() async {
        let urlFilterService = FakeURLFilterService()
        urlFilterService.removeConfigurationError = URLFilterServiceError.unsupportedPlatform
        let keychainStorage = FakeKeychainStorage()
        let bloomMetadataStorage = FakeBloomMetadataStorage()
        let fileService = FakeGroupFolderFileService()
        let (resetService, _) = makeResetService(
            urlFilterService: urlFilterService,
            keychainStorage: keychainStorage,
            bloomMetadataStorage: bloomMetadataStorage,
            fileService: fileService
        )

        let error = await resetService.reset()

        XCTAssertNil(error)
        XCTAssertEqual(urlFilterService.removeConfigurationCalls, 1)
        XCTAssertEqual(keychainStorage.resetCalls, 1)
        XCTAssertEqual(bloomMetadataStorage.removeCalls, 1)
    }

    func testConfigurationRemovalFailureStillCleansLocalState() async {
        let urlFilterService = FakeURLFilterService()
        urlFilterService.removeConfigurationError = TestError.generic
        let keychainStorage = FakeKeychainStorage()
        let bloomMetadataStorage = FakeBloomMetadataStorage()
        let fileService = FakeGroupFolderFileService()
        let (resetService, _) = makeResetService(
            urlFilterService: urlFilterService,
            keychainStorage: keychainStorage,
            bloomMetadataStorage: bloomMetadataStorage,
            fileService: fileService
        )

        let error = await resetService.reset()

        XCTAssertNotNil(error)
        XCTAssertEqual(keychainStorage.resetCalls, 1)
        XCTAssertEqual(bloomMetadataStorage.removeCalls, 1)
    }

    func testResetClearsInstallRequestedFlag() async {
        let urlFilterService = FakeURLFilterService()
        urlFilterService.status = .starting
        let (resetService, assembler) = makeResetService(
            urlFilterService: urlFilterService,
            keychainStorage: FakeKeychainStorage(),
            bloomMetadataStorage: FakeBloomMetadataStorage(),
            fileService: FakeGroupFolderFileService()
        )
        await assembler.markInstallRequested()

        let error = await resetService.reset()
        let state = await assembler.makeState()

        XCTAssertNil(error)
        XCTAssertFalse(state.info.isInstalling)
    }

    func testResetSkipsPrefilterRemovalWhenFileMissing() async {
        let fileService = FakeGroupFolderFileService()
        fileService.fileExists = false
        let (resetService, _) = makeResetService(
            urlFilterService: FakeURLFilterService(),
            keychainStorage: FakeKeychainStorage(),
            bloomMetadataStorage: FakeBloomMetadataStorage(),
            fileService: fileService
        )

        await resetService.reset()

        XCTAssertEqual(fileService.removeFileCalls, 0)
    }
}
