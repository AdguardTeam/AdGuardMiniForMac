// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FileStorageProtocol.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - FileStorageProtocol

protocol FileStorageProtocol {
    /// Origin full directory.
    var originDir: URL { get }

    /// Save data to file in origin folder.
    /// - Parameters:
    ///   - data: Data to save.
    ///   - relativePath: Path relative to the origin folder.
    ///   - fileExtension: Optional extension of file.
    /// - Returns: True if file was written.
    func saveFile(data: Data, relativePath: String, fileExtension: String?) async -> Bool

    /// Load data from file in origin folder.
    /// - Parameters:
    ///   - relativePath: Path relative to the origin folder.
    ///   - fileExtension: Optional extension of file.
    /// - Returns: Data if the load was successful, otherwise nil.
    func loadFile(relativePath: String, fileExtension: String?) async -> Data?

    /// Remove file in origin folder.
    /// - Parameters:
    ///   - relativePath: Path relative to the origin folder.
    ///   - fileExtension: Optional extension of file.
    /// - Returns: True if the file was removed or was already absent.
    func removeFile(relativePath: String, fileExtension: String?) async -> Bool

    /// Check that relative path is exists in origin folder.
    /// - Parameters:
    ///   - relativePath: Path relative to the origin folder.
    ///   - fileExtension: Optional extension of file.
    func isFileExists(relativePath: String, fileExtension: String?) async -> Bool

    /// Check that directory exists and not empty.
    /// - Parameter relativePath: Relative path to directory.
    /// - Returns: True if directory exists and not empty, otherwise false.
    func isDirectoryNotEmpty(relativePath: String) async -> Bool

    /// Create URL with format `path/to/origin/folder/relativePath`.
    /// - Parameters:
    ///   - relativePath: Path relative to the group folder.
    ///   - fileExtension: File extension, if necessary.
    /// - Returns: URL with format `path/to/origin/folder/relativePath<.fileExtension?>`.
    func buildUrl(relativePath: String, with fileExtension: String?) -> URL
}

extension FileStorageProtocol {
    @inlinable
    func saveFile(data: Data, relativePath: String) async -> Bool {
        await self.saveFile(data: data, relativePath: relativePath, fileExtension: nil)
    }

    @inlinable
    func loadFile(relativePath: String) async -> Data? {
        await self.loadFile(relativePath: relativePath, fileExtension: nil)
    }

    @inlinable
    func removeFile(relativePath: String) async -> Bool {
        await self.removeFile(relativePath: relativePath, fileExtension: nil)
    }

    @inlinable
    func isFileExists(relativePath: String) async -> Bool {
        await self.isFileExists(relativePath: relativePath, fileExtension: nil)
    }

    @inlinable
    func buildUrl(relativePath: String) -> URL {
        self.buildUrl(relativePath: relativePath, with: nil)
    }
}
