// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PathGrantStore.swift
//  AdguardMini
//

import Foundation

/// Thread-safe bounded store of picker-granted paths.
final class PathGrantStore {
    /// Shared instance.
    static let shared = PathGrantStore()

    private let lock = NSLock()
    private var granted: [String] = []
    private let capacity: Int

    /// Creates store.
    init(capacity: Int = 32) {
        // A non-positive capacity would make `removeLast(_:)` in `grant`
        // Trap with an index-out-of-range crash.
        precondition(capacity >= 0, "PathGrantStore capacity must be non-negative")
        self.capacity = capacity
    }

    /// Canonicalizes a path (collapses `.`/`..` and resolves symlinks) so
    /// the picker-granted path and the RPC-supplied path compare equal when
    /// they reference the same file (macOS filesystems are typically
    /// case-insensitive, and either side may carry a different spelling).
    private static func canonicalize(_ path: String) -> String {
        URL(fileURLWithPath: path).standardizedFileURL.resolvingSymlinksInPath().path
    }

    /// Records granted path.
    func grant(_ path: String) {
        let normalized = Self.canonicalize(path)
        lock.lock()
        defer { lock.unlock() }
        granted.removeAll { $0 == normalized }
        granted.insert(normalized, at: 0)
        if granted.count > capacity {
            granted.removeLast(granted.count - capacity)
        }
    }

    /// Returns whether path is granted.
    func isGranted(_ path: String) -> Bool {
        let normalized = Self.canonicalize(path)
        lock.lock()
        defer { lock.unlock() }
        return granted.contains(normalized)
    }

    /// Clears all grants.
    func clear() {
        lock.lock()
        defer { lock.unlock() }
        granted.removeAll()
    }
}
