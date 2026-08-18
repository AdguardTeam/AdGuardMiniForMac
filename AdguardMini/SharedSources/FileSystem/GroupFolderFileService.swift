// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  GroupFolderFileService.swift
//  AdguardMini
//

import Foundation
import UniformTypeIdentifiers
import AML

// MARK: - GroupFolderFileService

protocol GroupFolderFileService: FileStorageProtocol {}

extension GroupFolderFileService {
    func saveFile(data: Data, relativePath: String, fileExtension: String? = nil) async -> Bool {
        await self.saveFile(data: data, relativePath: relativePath, fileExtension: fileExtension)
    }

    func loadFile(relativePath: String, fileExtension: String? = nil) async -> Data? {
        await self.loadFile(relativePath: relativePath, fileExtension: fileExtension)
    }

    func removeFile(relativePath: String, fileExtension: String? = nil) async -> Bool {
        await self.removeFile(relativePath: relativePath, fileExtension: fileExtension)
    }

    func buildUrl(relativePath: String, with fileExtension: String? = nil) -> URL {
        self.buildUrl(relativePath: relativePath, with: fileExtension)
    }
}

// MARK: - GroupFolderFileServiceImpl

final class GroupFolderFileServiceImpl {
    // MARK: Private properties
    private let fileManager: AMFileManager

    // MARK: Init

    init(fileManager: AMFileManager) {
        self.fileManager = fileManager
    }

    convenience init() {
        self.init(fileManager: AMFileManagerImpl())
    }
}

// MARK: - GroupFolderFileService implementation

extension GroupFolderFileServiceImpl: GroupFolderFileService {
    var originDir: URL {
        self.buildUrl(relativePath: "")
    }

    func isFileExists(relativePath: String, fileExtension: String?) async -> Bool {
        await self.fileManager.isFileExists(url: self.buildUrl(relativePath: relativePath, with: fileExtension))
    }

    func isDirectoryNotEmpty(relativePath: String) async -> Bool {
        await self.fileManager.isDirectoryNotEmpty(self.buildUrl(relativePath: relativePath))
    }

    func saveFile(data: Data, relativePath: String, fileExtension: String? = nil) async -> Bool {
        var result = true
        let fullURL = self.buildUrl(relativePath: relativePath, with: fileExtension)
        if let error = await self.fileManager.saveFile(data: data, url: fullURL) {
            LogError("Can't save data to \(fullURL): \(error)")
            result = false
        }
        return result
    }

    func loadFile(relativePath: String, fileExtension: String? = nil) async -> Data? {
        let fullURL = self.buildUrl(relativePath: relativePath, with: fileExtension)
        let result = await self.fileManager.loadFile(url: fullURL)
        switch result {
        case .success(let data):
            return data
        case .failure(let error):
            LogError("Can't load data from \(fullURL): \(error)")
            return nil
        }
    }

    func removeFile(relativePath: String, fileExtension: String? = nil) async -> Bool {
        let fullURL = self.buildUrl(relativePath: relativePath, with: fileExtension)
        // The existence check is intentionally skipped.
        // The removal itself reports a missing file as success.
        // This also avoids the pre-check racing with a concurrent delete.
        guard let error = await self.fileManager.removeFile(url: fullURL) else {
            return true
        }
        let nsError = error as NSError
        if nsError.domain == NSCocoaErrorDomain && nsError.code == NSFileNoSuchFileError {
            return true
        }
        LogError("Can't remove file at \(fullURL): \(error)")
        return false
    }

    func buildUrl(relativePath: String, with fileExtension: String? = nil) -> URL {
        var url = self.fileManager.groupFolder.appendingPathComponent(relativePath)
        if let fileExtension {
            url.appendPathExtension(fileExtension)
        }
        return url
    }
}
