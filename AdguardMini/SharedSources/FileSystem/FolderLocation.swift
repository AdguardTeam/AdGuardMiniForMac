// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FolderLocation.swift
//  AdguardMini
//

// MARK: - Constants

private enum Constants {
    private static let library = "Library"
    private static let appSupport = "\(Self.library)/Application Support/\(BuildConfig.AG_APP_ID)"

    static let filtersDb = "\(Self.appSupport)/Filters"
    static let convertedFilters = "\(Self.appSupport)/ConvertedFilters"
    static let sentryStorage = "\(Self.appSupport)/TmpStorage/Sentry"
    static let statistics = "\(Self.appSupport)/Statistics"

    static let groupLog = "\(Self.library)/Logs/\(BuildConfig.AG_APP_ID)"
}

// MARK: - FolderLocation

enum FolderLocation {
    case filtersDb
    case convertedFilters
    case sentryStorage
    case groupLog
    case statistics
    case custom(relativePath: String)

    var path: String {
        switch self {
        case .filtersDb:        Constants.filtersDb
        case .convertedFilters: Constants.convertedFilters
        case .sentryStorage:    Constants.sentryStorage
        case .groupLog:         Constants.groupLog
        case .statistics:       Constants.statistics
        case .custom(let path): path
        }
    }
}
