// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailRulesetStorage.swift
//  AdguardMini
//

import Foundation

private enum Constants {
    static let mailRulesetFileExtension = MailRulesFileName.fileExtension
}

// MARK: - MailRulesetStorage

protocol MailRulesetStorage {
    /// Save the ruleset data atomically.
    /// - Parameter data: WebKit Content Blocking JSON to persist.
    /// - Returns: `true` if the file was written.
    func save(_ data: Data) async -> Bool
}

// MARK: - MailRulesetStorageAdapter

final class MailRulesetStorageAdapter: MailRulesetStorage {
    private let storage: FiltersStorage

    init(storage: FiltersStorage) {
        self.storage = storage
    }

    func save(_ data: Data) async -> Bool {
        await self.storage.saveFile(
            data: data,
            relativePath: MailRulesFileName.contentRules,
            fileExtension: Constants.mailRulesetFileExtension
        )
    }
}
