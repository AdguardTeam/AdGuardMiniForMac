// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  VersionedMigration.swift
//  AdguardMini
//

import AML
import Foundation

// MARK: - VersionedMigrationStorage

/// Protocol for reading/writing the version used by `VersionedMigration`.
protocol VersionedMigrationStorage: AnyObject {
    /// The persisted migration version. `nil` means no migration has ever run.
    var version: Int? { get set }
}

// MARK: - VersionedMigrationStorageImpl

/// UserDefaults-backed implementation.
final class VersionedMigrationStorageImpl: VersionedMigrationStorage {
    @UserDefault(.appDataVersion)
    var version: Int?
}

// MARK: - VersionedMigration

/// Version-based migration system for app data.
///
/// This system uses an independent `version` integer, decoupled from build
/// numbers and release cadence. The starting version is **2000**.
/// Each migration is registered with a `version` number and is executed
/// only when the persisted version is less than that number.
enum VersionedMigration {
    static let tag = "[Versioned Migration]"

    /// The current version that includes all registered migrations.
    /// Bump this when adding a new migration.
    static let currentVersion = 2000

    // MARK: - Run

    /// Runs version-based migrations on app launch.
    ///
    /// Call once during app startup **after** `registerUserDefaults()`,
    /// but **before** other service initialization that depends on migrated data.
    ///
    /// - Parameters:
    ///   - storage: Persistence for migration version.
    ///   - firstRun: Whether this is a fresh install.
    static func run(storage: VersionedMigrationStorage, firstRun: Bool) async {
        let savedVersion = storage.version

        // Fresh install: skip all migrations, just save current version
        if savedVersion.isNil && firstRun {
            storage.version = Self.currentVersion
            LogInfo("\(Self.tag) Fresh install, saved version=\(Self.currentVersion)")
            return
        }

        let effectiveVersion = savedVersion ?? 0

        // Downgrade detection
        if effectiveVersion > Self.currentVersion {
            LogWarn(
                "\(Self.tag) Downgrade detected (saved=\(effectiveVersion),"
                + " current=\(Self.currentVersion)). Skipping."
            )
            return
        }

        // No migrations needed
        if effectiveVersion == Self.currentVersion {
            LogInfo("\(Self.tag) No migrations needed (version=\(effectiveVersion))")
            return
        }

        LogInfo("\(Self.tag) Upgrading from version=\(effectiveVersion) to \(Self.currentVersion)")
        do {
            try await Self.perform(from: effectiveVersion)
            storage.version = Self.currentVersion
            LogInfo("\(Self.tag) Completed, saved version=\(Self.currentVersion)")
        } catch {
            LogError("\(Self.tag) Failed (from=\(effectiveVersion)): \(error)")
        }
    }

    // MARK: - Migrations

    /// Runs all registered migrations in order.
    ///
    /// **How to add a migration:**
    /// - Add a `tryUpdate(from:version:action:)` call below, ordered by ascending `version`.
    /// - `version` is the version that **includes** the migration.
    /// - The helper runs the action only when `savedVersion < version`.
    private static func perform(from savedVersion: Int) async throws {
        try await Self.tryUpdate(from: savedVersion, version: 2000) {
            Self.migrateToSharedKeychain()
        }
    }

    // MARK: - Helper

    /// Executes `action` only if `savedVersion < version`.
    private static func tryUpdate(
        from savedVersion: Int,
        version: Int,
        action: () async throws -> Void
    ) async throws {
        guard savedVersion < version else { return }
        LogInfo("\(tag) Running migration for version \(version)")
        let start = Date()
        try await action()
        let elapsed = Date().timeIntervalSince(start) * 1000
        LogInfo("\(tag) Migration for version \(version) completed in \(String(format: "%.1f", elapsed))ms")
    }

    // MARK: - Shared Keychain Migration

    /// Migrates `applicationId` and `licenseInfo` from non-shared keychain to
    /// shared keychain (AG_GROUP).
    ///
    /// For each item: read from non-shared → write to shared (overwriting) → delete non-shared.
    /// Items not found in non-shared keychain are skipped silently.
    private static func migrateToSharedKeychain() {
        let migrationTag = "[Shared Keychain Migration]"

        // Migrate applicationId
        let appIdKey = KeychainKey.Base.applicationId.key
        if let oldData: Data = Keychain.getValue(for: appIdKey) {
            Keychain.setShared(key: appIdKey, data: oldData)
            LogInfo("\(migrationTag) applicationId migrated to shared keychain")
            Keychain.delete(for: appIdKey)
        } else {
            LogInfo("\(migrationTag) applicationId not found in non-shared keychain, skipping")
        }

        // Migrate licenseInfo (already AES-encrypted, copy blob as-is)
        let licenseKey = KeychainKey.Secured.licenseInfo.key
        if let oldData: Data = Keychain.getValue(for: licenseKey) {
            Keychain.setShared(key: licenseKey, data: oldData)
            LogInfo("\(migrationTag) licenseInfo migrated to shared keychain")
            Keychain.delete(for: licenseKey)
        } else {
            LogInfo("\(migrationTag) licenseInfo not found in non-shared keychain, skipping")
        }
    }
}
