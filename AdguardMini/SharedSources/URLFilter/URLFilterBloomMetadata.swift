// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterBloomMetadata.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - URLFilterPrefilterFile

/// File name of the installed prefilter data in the shared App Group container.
///
/// Shared between the URL filter extension (writer) and the main app
/// (cleanup on settings reset).
enum URLFilterPrefilterFile {
    static let name = "urlfilter-prefilter-bloomfilterdata"
}

// MARK: - URLFilterBloomMetadata

/// Bloom filter metadata for the currently installed prefilter.
///
/// Decoded from the bloom params JSON by the URL filter extension, persisted
/// to the shared App Group defaults, and read by the main app to populate
/// ``URLFilterInfo/rulesCount`` and ``URLFilterInfo/lastUpdate``.
struct URLFilterBloomMetadata: Equatable, Codable, Sendable {
    /// Number of rules in the installed prefilter.
    var rulesCount: Int
    /// Timestamp of the last prefilter update.
    var timeUpdated: Date
    /// Tag identifying the installed prefilter.
    var tag: String
}

// MARK: - URLFilterBloomMetadataStorage

/// Reads and writes ``URLFilterBloomMetadata`` in the shared App Group defaults.
///
/// `Sendable` because the same instance is captured by `@Sendable` providers
/// passed across actor boundaries (`URLFilterStateAssembler`); `UserDefaults`
/// is thread-safe.
protocol URLFilterBloomMetadataStorage: Sendable {
    /// Loads the persisted metadata.
    /// - Returns: The metadata, or `nil` when it is absent, incomplete, or corrupted.
    func load() -> URLFilterBloomMetadata?
    /// Persists the given metadata.
    ///
    /// Metadata is encoded and stored as a single value.
    /// Readers in other processes always observe a complete snapshot.
    /// Either the old generation or the new one is visible, never a mix.
    func save(_ metadata: URLFilterBloomMetadata)
    /// Removes any persisted metadata.
    ///
    /// Called when the prefilter is uninstalled so stale rule counts and
    /// update times are not shown anymore.
    func remove()
}

// MARK: - URLFilterBloomMetadataStorageImpl

/// ``URLFilterBloomMetadataStorage`` backed by the shared App Group `UserDefaults`.
///
/// `@unchecked Sendable` because `UserDefaults` is documented as thread-safe
/// but does not formally conform to `Sendable`; it only needs concurrent
/// access for reads and writes, never exclusive isolation.
final class URLFilterBloomMetadataStorageImpl: URLFilterBloomMetadataStorage, @unchecked Sendable {
    /// Shared defaults key — the contract between the URL filter extension
    /// (writer) and the main app (reader).
    enum Keys {
        static let metadata = "urlFilterBloomMetadata"
    }

    private let userDefaults: UserDefaults

    /// Creates a storage over the given defaults suite.
    /// - Parameter userDefaults: Defaults suite to read from and write to.
    init(userDefaults: UserDefaults) {
        self.userDefaults = userDefaults
    }

    /// Creates a storage over the shared App Group defaults suite.
    convenience init() {
        let userDefaults = UserDefaults(suiteName: BuildConfig.AG_GROUP)

        guard let userDefaults else {
            let message = "Cannot initialize User defaults for group"
            LogError(message)
            fatalError(message)
        }

        self.init(userDefaults: userDefaults)
    }

    func load() -> URLFilterBloomMetadata? {
        guard let data = self.userDefaults.data(forKey: Keys.metadata) else {
            return nil
        }

        guard
            let metadata = try? JSONDecoder().decode(URLFilterBloomMetadata.self, from: data),
            metadata.rulesCount > 0,
            metadata.timeUpdated.timeIntervalSince1970 > 0
        else {
            return nil
        }

        return metadata
    }

    func save(_ metadata: URLFilterBloomMetadata) {
        guard let data = try? JSONEncoder().encode(metadata) else {
            LogError("Failed to encode bloom metadata")
            return
        }

        self.userDefaults.set(data, forKey: Keys.metadata)
    }

    func remove() {
        self.userDefaults.removeObject(forKey: Keys.metadata)
    }
}
