// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  GenericFileStorage.swift
//  AdguardMini
//

import Foundation
import AML

class GenericFileStorage: FileStorageProtocol {
    private let fileStorage: FileStorageProtocol
    private let origin: String

    let originDir: URL

    init(fileStorage: FileStorageProtocol, origin: FolderLocation) {
        self.fileStorage = fileStorage
        self.origin = origin.path
        self.originDir = fileStorage.buildUrl(relativePath: origin.path, with: nil)

        self.createOriginDir()
    }

    func saveFile(data: Data, relativePath: String, fileExtension: String?) async -> Bool {
        await self.fileStorage.saveFile(
            data: data,
            relativePath: self.updateRelativePath(relativePath),
            fileExtension: fileExtension
        )
    }

    func loadFile(relativePath: String, fileExtension: String?) async -> Data? {
        await self.fileStorage.loadFile(
            relativePath: self.updateRelativePath(relativePath),
            fileExtension: fileExtension
        )
    }

    func removeFile(relativePath: String, fileExtension: String?) async -> Bool {
        await self.fileStorage.removeFile(
            relativePath: self.updateRelativePath(relativePath),
            fileExtension: fileExtension
        )
    }

    func isFileExists(relativePath: String, fileExtension: String?) async -> Bool {
        await self.fileStorage.isFileExists(
            relativePath: self.updateRelativePath(relativePath),
            fileExtension: fileExtension
        )
    }

    func isDirectoryNotEmpty(relativePath: String) async -> Bool {
        await self.fileStorage.isDirectoryNotEmpty(relativePath: relativePath)
    }

    func buildUrl(relativePath: String, with fileExtension: String?) -> URL {
        self.fileStorage.buildUrl(
            relativePath: self.updateRelativePath(relativePath),
            with: fileExtension
        )
    }

    private func updateRelativePath(_ relativePath: String) -> String {
        "\(self.origin)/\(relativePath)"
    }

    private func createOriginDir() {
        let url = self.originDir
        do {
            try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        } catch {
            LogError("Can't create dir: \(url)")
        }
    }
}
