// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LogConfig.swift
//  AdguardMini
//

import Foundation
import AML

private enum Constants {
    static let groupLogfilePathName = "\(BuildConfig.AG_PRODUCT_NAME)-group"
}

enum LogConfig {
    nonisolated(unsafe) private static let fileService: FileStorageProtocol = LogStorage()

    static let groupLogfilePath: String = {
        Self.fileService.buildUrl(relativePath: Constants.groupLogfilePathName, with: "log").path
    }()

    static func setupSharedLogger(for subsystem: Subsystem) {
        let logpath = self.groupLogfilePath

        Logger.shared.handlers = [
            FileLogHandler(subsystem: subsystem.name, filepath: logpath),
            OSLogHandler(subsystem: subsystem.name)
        ]
    }
}

private final class LogStorage: GenericFileStorage {
    init() {
        super.init(fileStorage: GroupFolderFileServiceImpl(), origin: .groupLog)
    }
}
