// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppLogConfig.swift
//  AdguardMini
//

import Foundation
import AML
import ProtoSchema

enum AppLogConfig {
    static func setup() {
        Logger.shared.handlers = [
            FileLogHandler(subsystem: BuildConfig.AG_APP_ID, filepath: LogConfig.groupLogfilePath),
            OSLogHandler(subsystem: BuildConfig.AG_APP_ID),
            LastErrorLogHandler()
        ]

        LogManager.shared = LogManager(
            handlers: [FileLogManager(logPath: LogConfig.groupLogfilePath)]
        )

        #if DEBUG
        Logger.shared.logLevel = .debug
        #else
        Logger.shared.logLevel = Keychain.debugLogging ? .debug : .info
        #endif

        // Route the WKWebView bridge diagnostics (`BridgeLog`, declared in the
        // ProtoSchema package, which cannot reference AML) through the app's
        // Logger. Codegen-emitted service and callback log lines land in the
        // Log file and OSLog, and in the last-error store, right from the
        // Very first RPC. Installed before any host builds a bridge, so the
        // BridgeLog sink is in place before the first bridge message arrives.
        BridgeLog.sink = { level, message in
            switch level {
            case .debug:   LogDebug(message)
            case .info:    LogInfo(message)
            case .warning: LogWarn(message)
            case .error:   LogError(message)
            }
        }
    }

    static func saveLastErrorMessage(_ msg: String) {
        UserDefaults.standard.set(msg, forKey: SettingsKey.lastError.rawValue)
    }

    static func getLastErrorMessage() -> String? {
        UserDefaults.standard.string(forKey: SettingsKey.lastError.rawValue)
    }

    static func resetLog() {
        LogManager.shared.resetLog()
    }
}

final class LastErrorLogHandler: LogHandlerProtocol {
    func log(level: LogLevel, date: Date, _ msg: String) {
        if level == .error {
            AppLogConfig.saveLastErrorMessage(msg)
        }
    }
}
