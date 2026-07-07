// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ContentBlocker.swift
//  MailBlocker
//

import AML
import Foundation
import MailKit

/// MailKit content blocker that serves Content Blocking JSON to Mail.app
/// from the shared App Group. Falls back to `[]` when the file is missing,
/// unreadable, or invalid.
final class ContentBlocker: NSObject, MEContentBlocker {
    static let shared = ContentBlocker()

    private let filtersStorage: FiltersStorage

    override private init() {
        let fileManager = AMFileManagerImpl()
        let fileService = GroupFolderFileServiceImpl(fileManager: fileManager)
        self.filtersStorage = FiltersStorageImpl(fileStorage: fileService)
        super.init()
    }

    func contentRulesJSON() -> Data {
        let rulesURL = self.filtersStorage.buildUrl(
            relativePath: MailRulesFileName.contentRules,
            with: MailRulesFileName.fileExtension
        )

        guard let data = try? Data(contentsOf: rulesURL) else {
            LogError("Mail content rules file is missing or unreadable: \(rulesURL.path)")
            return Self.emptyRuleset
        }

        do {
            _ = try JSONSerialization.jsonObject(with: data)
        } catch {
            LogError("Mail content rules file is not valid JSON: \(error.localizedDescription)")
            return Self.emptyRuleset
        }

        return data
    }

    private static let emptyRuleset: Data = Data("[]".utf8)
}
