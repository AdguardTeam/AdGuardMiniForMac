// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  BuildMigrationRunnerTests.swift
//  AdguardMiniTests
//

import XCTest

final class BuildMigrationRunnerTests: XCTestCase {
    func testFreshInstall_SavesBuildNumber() async {
        let storage = BuildMigrationStorageMock()

        await BuildMigration.run(storage: storage, currentBuild: 1050, firstRun: true)

        XCTAssertEqual(storage.migrationVersion, 1050)
    }

    func testExistingUser_NilSavedBuild_TreatsAsUpgradeFromZero() async {
        let storage = BuildMigrationStorageMock()

        await BuildMigration.run(storage: storage, currentBuild: 1050, firstRun: false)

        XCTAssertEqual(storage.migrationVersion, 1050)
    }

    func testUpgrade_SavesNewBuildNumber() async {
        let storage = BuildMigrationStorageMock()
        storage.migrationVersion = 1018

        await BuildMigration.run(storage: storage, currentBuild: 1050, firstRun: false)

        XCTAssertEqual(storage.migrationVersion, 1050)
    }

    func testNoOp_SameBuild_DoesNotUpdateStorage() async {
        let storage = BuildMigrationStorageMock()
        storage.migrationVersion = 1050

        await BuildMigration.run(storage: storage, currentBuild: 1050, firstRun: false)

        XCTAssertEqual(storage.migrationVersion, 1050)
    }

    func testDowngrade_DoesNotUpdateStorage() async {
        let storage = BuildMigrationStorageMock()
        storage.migrationVersion = 2000

        await BuildMigration.run(storage: storage, currentBuild: 1050, firstRun: false)

        XCTAssertEqual(storage.migrationVersion, 2000)
    }

    func testVersionSkip_MultipleVersions_SavesCurrentBuild() async {
        let storage = BuildMigrationStorageMock()
        storage.migrationVersion = 900

        await BuildMigration.run(storage: storage, currentBuild: 1050, firstRun: false)

        XCTAssertEqual(storage.migrationVersion, 1050)
    }
}
