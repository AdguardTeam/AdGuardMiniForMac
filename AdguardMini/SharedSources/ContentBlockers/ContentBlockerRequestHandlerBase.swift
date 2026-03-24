// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ContentBlockerRequestHandlerBase.swift
//  AdguardMini
//

import Foundation
import AML

private enum Constants {
    static let emptyRulesURI: String = "emptyBlockingRules"
}

// MARK: - ContentBlockerRequestHandlerBase dependencies

extension ContentBlockerRequestHandlerBase:
    FiltersStorageDependent,
    SharedSettingsStorageDependent {}

// MARK: - SSContentBlockerRequestHandlerBase

/// Base class for all content blocker classes
class ContentBlockerRequestHandlerBase: NSObject {
    // MARK: Private properties

    private var rulesURL: URL {
        self.filtersStorage.buildUrl(
            relativePath: Self.blockerType.contentBlockingPath,
            with: "json"
        )
    }

    private var emptyRulesProvider: NSItemProvider? {
        let url = Bundle.main.url(forResource: Constants.emptyRulesURI, withExtension: "json")
        return NSItemProvider(contentsOf: url)
    }

    private var currentRulesProvider: NSItemProvider? {
        NSItemProvider(contentsOf: self.rulesURL)
    }

    // MARK: Public properties

    class var blockerType: SafariBlockerType {
        SafariBlockerType.general
    }

    // MARK: Dependencies

    var filtersStorage: FiltersStorage!
    var sharedSettingsStorage: SharedSettingsStorage!

    // MARK: Init

    override init() {
        super.init()
        self.setupServices()
    }
}

// MARK: - NSExtensionRequestHandling

extension ContentBlockerRequestHandlerBase: NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let blockerType = Self.blockerType
        let protectionEnabled = self.sharedSettingsStorage.protectionEnabled

        let rulesUrl = self.filtersStorage.buildUrl(
            relativePath: blockerType.contentBlockingPath,
            with: "json"
        )
        let fileExists = FileManager.default.fileExists(atPath: rulesUrl.path)
        let fileSize = (try? FileManager.default.attributesOfItem(atPath: rulesUrl.path)[.size] as? Int) ?? -1

        LogInfo(
            "beginRequest \(blockerType): "
            + "protection=\(protectionEnabled), "
            + "fileExists=\(fileExists), "
            + "fileSize=\(fileSize), "
            + "url=\(rulesUrl.path)"
        )

        let attachment =
        protectionEnabled
        ? self.currentRulesProvider
        : self.emptyRulesProvider

        if let attachment {
            let item = NSExtensionItem()
            item.attachments = [attachment]

            context.completeRequest(returningItems: [item], completionHandler: nil)
        } else {
            LogInfo("beginRequest \(blockerType): No converted or bundled rules — returning nil")
            context.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }
}
