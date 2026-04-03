// SPDX-FileCopyrightText: AdGuard Software Limited
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  DeduplicationState.swift
//  PopupExtension
//

import Foundation

/// Tracks per-blocker hit counts for each `(page, url)` pair and computes a
/// deduplicated ads-blocked total using a max-count heuristic across
/// non-privacy blocker types.
///
/// For each callback `(pageHash, url, blockerType)`:
/// 1. Look up `oldCount` for that triple (default 0).
/// 2. Compute `oldMax` = max over all blocker types for `(pageHash, url)`.
/// 3. Increment count → `newCount`.
/// 4. `delta = (newCount > oldMax) ? 1 : 0`
///
/// This produces at most 1 increment per callback position in the evolving
/// `(page, url)` sequence, even if multiple non-privacy content blockers
/// report it.
///
/// The algorithm does not identify requests directly; it approximates unique
/// blocked ad events by comparing per-blocker hit counts for the same
/// `(page, url)`.
struct DeduplicationState {
    /// `pageHash → URL → SafariBlockerType → hitCount`
    private var counts: [Int: [URL: [SafariBlockerType: Int]]] = [:]

    /// Records a content blocker callback and returns the delta (0 or 1) to add
    /// to the deduplicated ads-blocked total.
    ///
    /// - Parameters:
    ///   - pageHash: The hash of the `SFSafariPage` identifying the tab.
    ///   - url: The blocked resource URL.
    ///   - blockerType: The content blocker type that fired.
    /// - Returns: 1 if this callback represents a new unique blocked ad
    ///   request, 0 otherwise. Privacy callbacks are ignored because privacy
    ///   statistics are reported separately in the UI.
    mutating func recordCallback(pageHash: Int, url: URL, blockerType: SafariBlockerType) -> Int {
        guard blockerType != .privacy else {
            return 0
        }

        let oldCount = self.counts[pageHash]?[url]?[blockerType] ?? 0
        let newCount = oldCount + 1

        // Compute old max across all blocker types for this (page, url)
        let urlCounts = self.counts[pageHash]?[url] ?? [:]
        var oldMax = 0
        for (bt, count) in urlCounts {
            let effective = (bt == blockerType) ? oldCount : count
            if effective > oldMax {
                oldMax = effective
            }
        }

        self.counts[pageHash, default: [:]][url, default: [:]][blockerType] = newCount

        let delta = (newCount > oldMax) ? 1 : 0
        assert(delta == 0 || delta == 1, "Delta must be 0 or 1, got \(delta)")
        return delta
    }
}
