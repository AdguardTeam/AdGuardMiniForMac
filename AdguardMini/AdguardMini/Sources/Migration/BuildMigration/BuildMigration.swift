// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  BuildMigration.swift
//  AdguardMini
//

import AML
import Foundation

// MARK: - BuildMigration

enum BuildMigration {
    static let tag = "[Build Migration]"

    // MARK: - Run

    /// Runs build-number-based migrations on app launch.
    /// Call once during app startup after `registerUserDefaults()`.
    static func run(storage: BuildMigrationStorage, currentBuild: Int, firstRun: Bool) async {
        let savedBuild = storage.migrationVersion

        // Fresh install: no migrations needed, just record the current build
        if savedBuild.isNil && firstRun {
            storage.migrationVersion = currentBuild
            LogInfo("\(Self.tag) Fresh install, saved build=\(currentBuild)")
            return
        }

        let fromBuild = savedBuild ?? 0

        if currentBuild < fromBuild {
            LogWarn("\(Self.tag) Downgrade detected (saved=\(fromBuild), current=\(currentBuild)). Skipping.")
            return
        }

        if currentBuild == fromBuild {
            LogInfo("\(Self.tag) No migrations needed (build=\(currentBuild))")
            return
        }

        LogInfo("\(Self.tag) Upgrading from \(fromBuild) to \(currentBuild)")
        do {
            try await perform(from: fromBuild, to: currentBuild)
            storage.migrationVersion = currentBuild
            LogInfo("\(Self.tag) Completed, saved build=\(currentBuild)")
        } catch {
            LogError("\(Self.tag) Failed (from=\(fromBuild), to=\(currentBuild)): \(error)")
        }
    }

    // MARK: - Migrations

    /// Runs all registered build-number-based migrations in order.
    ///
    /// **How to add a migration:**
    /// - Add a `tryUpdate(from:checkBuild:action:)` call below, ordered by ascending `checkBuild`.
    /// - `checkBuild` is the first build that must already include the migration.
    /// - The helper runs the action only when `savedBuild < checkBuild`, so skipped versions
    ///   are handled automatically: upgrading from 1000 to 1050 runs all migrations with
    ///   `checkBuild` in range 1001…1050.
    /// - Migrations are usually inline closures. If the body becomes large, extract it into
    ///   a private helper in this file and call it from the closure.
    ///
    /// **Example:**
    /// ```swift
    /// private static func perform(from savedBuild: Int, to currentBuild: Int) async throws {
    ///     try await tryUpdate(from: savedBuild, checkBuild: 1025) {
    ///         // Perform migration work
    ///     }
    /// }
    /// ```
    private static func perform(from savedBuild: Int, to currentBuild: Int) async throws {
        // No migrations registered yet.
    }

    // MARK: - Helper

    /// Executes `action` only if `savedBuild < checkBuild`.
    private static func tryUpdate(from savedBuild: Int, checkBuild: Int, action: () async throws -> Void) async throws {
        guard savedBuild < checkBuild else { return }
        LogInfo("\(tag) Running migration for build \(checkBuild)")
        let start = Date()
        try await action()
        let elapsed = Date().timeIntervalSince(start) * 1000
        LogInfo("\(tag) Migration for build \(checkBuild) completed in \(String(format: "%.1f", elapsed))ms")
    }
}
