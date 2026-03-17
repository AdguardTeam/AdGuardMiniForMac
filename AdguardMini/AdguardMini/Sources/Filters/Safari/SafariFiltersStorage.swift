// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariFiltersStorage.swift
//  AdguardMini
//

import Foundation
import FilterEngine
import AML

private enum Constants {
    static func fileExtension(for type: SafariBlockerType) -> String {
        type == .advanced ? "" : "json"
    }
}

protocol SafariFiltersStorage {
    var isAllRulesExists: Bool { get async }

    func save(data: Data, type: SafariBlockerType) async -> Bool
    func rulesUrl(for type: SafariBlockerType) -> URL
    func isRulesExists(for type: SafariBlockerType) async -> Bool
    /// Remove all stored rules for content blockers.
    func resetStorage()
}

final class SafariFiltersStorageImpl {
    private let storage: FiltersStorage

    init(storage: FiltersStorage) {
        self.storage = storage
    }
}

extension SafariFiltersStorageImpl: SafariFiltersStorage {
    var baseUrl: URL {
        self.storage.originDir
    }

    var isAllRulesExists: Bool {
        get async {
            for type in SafariBlockerType.allCases where await !self.isRulesExists(for: type) {
                return false
            }
            return true
        }
    }

    func save(data: Data, type: SafariBlockerType) async -> Bool {
        await self.storage.saveFile(
            data: data,
            relativePath: type.contentBlockingPath,
            fileExtension: Constants.fileExtension(for: type)
        )
    }

    func rulesUrl(for type: SafariBlockerType) -> URL {
        self.storage.buildUrl(
            relativePath: type.contentBlockingPath,
            with: Constants.fileExtension(for: type)
        )
    }

    func isRulesExists(for type: SafariBlockerType) async -> Bool {
        await self.storage.isFileExists(
            relativePath: type.contentBlockingPath,
            fileExtension: Constants.fileExtension(for: type)
        )
    }

    func resetStorage() {
        for type in SafariBlockerType.allCases {
            do {
                if type == .advanced {
                    let items = try FileManager.default.contentsOfDirectory(
                        at: self.rulesUrl(for: type),
                        includingPropertiesForKeys: nil,
                        options: []
                    )
                    for url in items {
                        do {
                            try FileManager.default.removeItem(at: url)
                        } catch {
                            LogWarn("Could not remove \(url.lastPathComponent): \(error)")
                        }
                    }
                } else {
                    try FileManager.default.removeItem(at: self.rulesUrl(for: type))
                }
            } catch {
                LogWarn("Can't remove stored rules: \(error)")
            }
        }
    }
}
