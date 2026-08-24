// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FilePanelPresenterTests.swift
//  AdguardMiniTests
//

import XCTest
import UniformTypeIdentifiers

final class FilePanelPresenterTests: XCTestCase {
    func testContentTypes_ParsesCommaSeparatedExtensions() throws {
        let types = NSFilePanelPresenter.contentTypes(from: "txt,zip")
        let txtType = try XCTUnwrap(UTType(filenameExtension: "txt"))
        let zipType = try XCTUnwrap(UTType(filenameExtension: "zip"))
        XCTAssertEqual(types, [txtType, zipType])
    }

    func testContentTypes_EmptyString_YieldsNoTypes() {
        XCTAssertTrue(NSFilePanelPresenter.contentTypes(from: "").isEmpty)
    }

    func testContentTypes_UnknownExtension_IsSkipped() throws {
        let types = NSFilePanelPresenter.contentTypes(from: "txt,notarealext")
        let txtType = try XCTUnwrap(UTType(filenameExtension: "txt"))
        XCTAssertEqual(types, [txtType])
    }

    // MARK: - splitSavePath

    func testSplitSavePath_FullPathWithSuggestedName() {
        let (directory, fileName) = NSFilePanelPresenter.splitSavePath(
            "/Users/x/Documents/adguard_mini_20260812120000"
        )
        XCTAssertEqual(directory, "/Users/x/Documents")
        XCTAssertEqual(fileName, "adguard_mini_20260812120000")
    }

    func testSplitSavePath_BareFileNamePath_YieldsRootDirectory() {
        let (directory, fileName) = NSFilePanelPresenter.splitSavePath(
            "/adguard_mini_20260812120000"
        )
        XCTAssertEqual(directory, "/")
        XCTAssertEqual(fileName, "adguard_mini_20260812120000")
    }

    func testSplitSavePath_TrailingSlash_YieldsEmptyFileName() {
        let (directory, fileName) = NSFilePanelPresenter.splitSavePath(
            "/Users/x/Documents/"
        )
        XCTAssertEqual(directory, "/Users/x/Documents")
        XCTAssertEqual(fileName, "")
    }

    func testSplitSavePath_Root_YieldsEmptyFileName() {
        let (directory, fileName) = NSFilePanelPresenter.splitSavePath("/")
        XCTAssertEqual(directory, "/")
        XCTAssertEqual(fileName, "")
    }

    func testSplitSavePath_BareRelativeFilename_YieldsEmptyDirectory() {
        let (directory, fileName) = NSFilePanelPresenter.splitSavePath(
            "adguard_mini_20260812120000"
        )
        XCTAssertEqual(directory, "")
        XCTAssertEqual(fileName, "adguard_mini_20260812120000")
    }

    // MARK: - resolvedDirectory

    func testResolvedDirectory_ExistingDirectory_IsUsed() throws {
        let tempDir = NSTemporaryDirectory()
        let resolved = try XCTUnwrap(NSFilePanelPresenter.resolvedDirectory(from: tempDir))
        // Match production's normalization exactly: `resolvedDirectory` returns
        // A plain `URL(fileURLWithPath:isDirectory:)` (no standardization).
        XCTAssertEqual(resolved.path, URL(fileURLWithPath: tempDir, isDirectory: true).path)
    }

    func testResolvedDirectory_NilOrEmpty_FallsBackToDocuments() {
        XCTAssertEqual(
            NSFilePanelPresenter.resolvedDirectory(from: nil),
            NSFilePanelPresenter.documentsDirectory
        )
        XCTAssertEqual(
            NSFilePanelPresenter.resolvedDirectory(from: ""),
            NSFilePanelPresenter.documentsDirectory
        )
    }

    func testResolvedDirectory_Root_FallsBackToDocuments() {
        // The TS export callers pass a bare suggested-filename path whose
        // Directory component is the volume root. The panel must not open
        // At the root: the Documents directory is used instead.
        XCTAssertEqual(
            NSFilePanelPresenter.resolvedDirectory(from: "/"),
            NSFilePanelPresenter.documentsDirectory
        )
    }

    func testResolvedDirectory_ExistingFile_FallsBackToDocuments() throws {
        // A path that points at an existing file (not a directory) must not
        // Be used as the panel's directory — Documents applies instead.
        let fileURL = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("adguard-panel-\(UUID().uuidString).txt")
        try Data().write(to: fileURL)
        defer { try? FileManager.default.removeItem(at: fileURL) }

        XCTAssertEqual(
            NSFilePanelPresenter.resolvedDirectory(from: fileURL.path),
            NSFilePanelPresenter.documentsDirectory
        )
    }

    func testResolvedDirectory_NonExistentPath_FallsBackToDocuments() {
        let missing = "/Users/definitely-not-a-real-user-\(UUID().uuidString)/nope"
        XCTAssertEqual(
            NSFilePanelPresenter.resolvedDirectory(from: missing),
            NSFilePanelPresenter.documentsDirectory
        )
    }
}
