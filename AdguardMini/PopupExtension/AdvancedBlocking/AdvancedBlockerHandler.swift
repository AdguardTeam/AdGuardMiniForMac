// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AdvancedBlockerHandler.swift
//  PopupExtension
//

import SafariServices
import AML
import FilterEngine

// MARK: - Constants

private enum Constants {
    static let contentScriptResponseMessage = "requestRules"
    static let contentScriptMessage = "requestRules"
    static let urlField = "url"
}

// MARK: - AdvancedBlockerHandler

protocol AdvancedBlockerHandler {
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String: Any])
}

// MARK: - AdvancedBlockerHandlerImpl

/// Handler for events from advanced blocking script
final class AdvancedBlockerHandlerImpl {
    // MARK: Private properties

    private let webExtension: WebExtension
    private let sharedSettingsStorage: SharedSettingsStorage

    // MARK: Init

    init(webExtension: WebExtension, sharedSettingsStorage: SharedSettingsStorage) {
        self.webExtension = webExtension
        self.sharedSettingsStorage = sharedSettingsStorage
    }
}

// MARK: - AdvancedBlockerHandler implementation

extension AdvancedBlockerHandlerImpl: AdvancedBlockerHandler {
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String: Any]) {
        LogDebug("AdvancedBlocking received a message: \(messageName)")

        guard messageName == Constants.contentScriptMessage,
              self.sharedSettingsStorage.protectionEnabled,
              self.sharedSettingsStorage.advancedRules
        else {
            LogInfo("Prevent advanced rules dispatching for some reasons.")
            return
        }

        let responseUserInfo = self.webExtension.processScriptMessageAndGetResponseUserInfo(
            userInfo
        )

        guard !responseUserInfo.isEmpty else {
            return
        }

        page.dispatchMessageToScript(
            withName: Constants.contentScriptResponseMessage,
            userInfo: responseUserInfo
        )
    }
}
