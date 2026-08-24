// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PathConfiner.swift
//  AdguardMini
//

import Foundation

/// Path decision helper.
enum PathConfiner {
    /// Returns whether path is accepted.
    static func isConfinable(
        _ path: String,
        granted: PathGrantStore,
        containerRoots: [String]
    ) -> Bool {
        guard !path.isEmpty, path.hasPrefix("/") else { return false }
        // Collapse `..` and `.` so a traversal like `<root>/../../etc` cannot
        // Pass a raw prefix check while resolving outside the container.
        let standardized = (path as NSString).standardizingPath
        if granted.isGranted(standardized) { return true }
        // Require a path-component boundary so a sibling like `<root>2` or
        // `<root>Evil` cannot match a `<root>` container root.
        return containerRoots.contains { root in
            let rootPath = (root as NSString).standardizingPath
            return standardized == rootPath || standardized.hasPrefix(rootPath + "/")
        }
    }

    /// The path an import/export input must clear in
    /// `isConfinable(_:granted:containerRoots:)`.
    ///
    /// Returns the file path for a `file:` URL, the input unchanged for a
    /// bare path or a `file:` URL that carries no path, and `nil` for a
    /// remote or foreign scheme, which needs no confinement.
    static func confinementPath(for input: String) -> String? {
        if let components = URLComponents(string: input), let scheme = components.scheme {
            guard scheme == "file" else { return nil }
            // The empty check is what makes the fallback mean "no path to
            // Extract". `URL.path` is non-optional, so `?? input` alone only
            // Covers a `URL(string:)` that returns nil — and `"file:"` does
            // Parse, into a URL whose path is "". Without this guard the
            // Function answers "" for such an input instead of handing the
            // Input back.
            guard let path = URL(string: input)?.path, !path.isEmpty else { return input }
            return path
        }
        return input
    }

    /// Returns container roots.
    static func containerRoots(appGroupIdentifier: String?) -> [String] {
        var roots = [NSHomeDirectory()]
        if let appGroupIdentifier,
           let group = FileManager.default.containerURL(
               forSecurityApplicationGroupIdentifier: appGroupIdentifier
           ) {
            roots.append(group.path)
        }
        return roots
    }
}
