// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  BuildMigrationStorage.swift
//  AdguardMini
//

import Foundation

// MARK: - BuildMigrationStorage

protocol BuildMigrationStorage: AnyObject {
    var migrationVersion: Int? { get set }
}

// MARK: - BuildMigrationStorageImpl

final class BuildMigrationStorageImpl: BuildMigrationStorage {
    @UserDefault(.migrationVersion)
    var migrationVersion: Int?
}
