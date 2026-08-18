// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AMFileManager.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - Constants

fileprivate enum Constants {
    static let cacheDirectoryName = "Library/Caches"
}

// MARK: - AMFileManager

protocol AMFileManager: AnyObject, Sendable {
    var groupFolder: URL { get }
    var cacheFolder: URL { get }

    func saveFile(data: Data, url: URL) async -> Error?
    func loadFile(url: URL) async -> Result<Data, Error>
    func removeFile(url: URL) async -> Error?

    func isFileExists(url: URL) async -> Bool
    func isDirectoryNotEmpty(_ url: URL) async -> Bool
}

// MARK: - AMFileManagerImpl

final actor AMFileManagerImpl: AMFileManager {
    // MARK: Private properties

    private let fileManager = FileManager.default

    // MARK: Public properties

    let groupFolder: URL
    let cacheFolder: URL

    // MARK: Init

    init() {
        guard let groupUrl = self
            .fileManager
            .containerURL(forSecurityApplicationGroupIdentifier: BuildConfig.AG_MAC_GROUP)
        else {
            LogError("Can't get group folder")
            fatalError("Group url is nil")
        }
        self.groupFolder = groupUrl
        self.cacheFolder = groupUrl
            .appendingPathComponent(Constants.cacheDirectoryName, isDirectory: true)
    }

    // MARK: Public methods

    func saveFile(data: Data, url: URL) async -> Error? {
        await Task.detached(priority: .userInitiated) {
            do {
                try data.write(to: url, options: .atomic)
            } catch {
                return error
            }
            return nil
        }
        .value
    }

    func loadFile(url: URL) async -> Result<Data, Error> {
        await Task.detached(priority: .userInitiated) {
            let result: Result<Data, Error>
            do {
                let data = try Data(contentsOf: url)
                return .success(data)
            } catch {
                result = .failure(error)
            }
            return result
        }
        .value
    }

    func isFileExists(url: URL) async -> Bool {
        self.fileManager.fileExists(atPath: url.path)
    }

    func removeFile(url: URL) async -> Error? {
        await Task.detached(priority: .userInitiated) {
            do {
                try FileManager.default.removeItem(at: url)
            } catch {
                return error
            }
            return nil
        }
        .value
    }

    func isDirectoryNotEmpty(_ url: URL) async -> Bool {
        guard await self.isFileExists(url: url) else {
            return false
        }

        let items = try? FileManager.default.contentsOfDirectory(
            at: url,
            includingPropertiesForKeys: nil,
            options: []
        )
        return !(items?.isEmpty ?? true)
    }
}
