// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ExtensionSafariApiClientImpl+Extensions.swift
//  PopupExtension
//

import AML
import XPCGateLib

// MARK: - MainAppApi

extension ExtensionSafariApiClientImpl: MainAppApi {
    func appState(after time: EBATimestamp, reply: @escaping (EBAAppState?, Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(nil, ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.appState(after: time, reply: reply)
        }
    }

    func appState(_ reply: @escaping (EBAAppState?, Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(nil, ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.appState(reply)
        }
    }

    func getCurrentFilteringState(withUrl url: String,
                                  reply: @escaping (EBACurrentFilteringState?, Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(nil, ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.getCurrentFilteringState(withUrl: url, reply: reply)
        }
    }

    func getExtraState(withUrl url: String, reply: @escaping (Bool, Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(false, ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.getExtraState(withUrl: url, reply: reply)
        }
    }

    func isAllExtensionsEnabled(reply: @escaping (Bool, Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(false, ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.isAllExtensionsEnabled(reply: reply)
        }
    }

    func isOnboardingCompleted(reply: @escaping (Bool, Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(false, ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.isOnboardingCompleted(reply: reply)
        }
    }

    func setProtectionStatus(_ enabled: Bool, reply: @escaping (EBATimestamp, Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(EBATimestamp.zero, ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.setProtectionStatus(enabled, reply: reply)
        }
    }

    func setFilteringStatusWithUrl(_ url: String,
                                   isEnabled: Bool,
                                   reply: @escaping (EBATimestamp, Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(EBATimestamp.zero, ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.setFilteringStatusWithUrl(url,
                                         isEnabled: isEnabled,
                                         reply: reply)
        }
    }

    func addRule(_ ruleText: String, reply: @escaping (Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.addRule(ruleText, reply: reply)
        }
    }

    func reportSite(with url: String,
                    reply: @escaping (String?, Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(nil, ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.reportSite(with: url, reply: reply)
        }
    }

    func openSafariSettings(reply: @escaping (Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.openSafariSettings(reply: reply)
        }
    }

    func telemetryPageViewEvent(_ screenName: String, reply: @escaping (Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.telemetryPageViewEvent(screenName, reply: reply)
        }
    }

    func telemetryActionEvent(screenName: String, action: String, reply: @escaping (Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.telemetryActionEvent(screenName: screenName, action: action, reply: reply)
        }
    }

    func notifyWindowOpened(reply: @escaping (Error?) -> Void) {
        LogDebugTrace()
        self.withSafariApi(else: { reply(ExtensionSafariApiClientErrorCode.linkTimeout) }) {
            $0.notifyWindowOpened(reply: reply)
        }
    }
}

// MARK: - SafariPopupApi implementation

extension ExtensionSafariApiClientImpl: SafariPopupApi {
    func setLogLevel(_ logLevel: LogLevel) {
        LogDebug("setLogLevel: \(logLevel)")
        self.delegate?.setLogLevel(logLevel)
    }

    func appStateChanged(_ appState: EBAAppState) {
        LogDebug("appStateChanged \(appState)")
        self.delegate?.appStateChanged(appState)
    }

    func setTheme(_ theme: Theme) {
        LogDebug("setTheme: \(theme)")
        self.delegate?.setTheme(theme)
    }
}

// MARK: - XPCGateClientDelegate implementation

extension ExtensionSafariApiClientImpl: XPCGateClientDelegate {
    func configureServiceConnection(_ connection: NSXPCConnection) {
        connection.exportedObject = self
        connection.exportedInterface = NSXPCInterface(with: SafariPopupApi.self)
        connection.remoteObjectInterface = NSXPCInterface(with: MainAppApi.self)
    }
}
