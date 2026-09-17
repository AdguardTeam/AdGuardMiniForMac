// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterState+Diagnostics.swift
//  AdguardMini
//

import Foundation

// MARK: - URLFilterState + Diagnostics

extension URLFilterState {
    /// Formats the "System Wide Protection" diagnostics section of `state.txt`.
    ///
    /// The raw filter state supplies enabled/status/disconnect-error; the
    /// UI-facing protection level and bloom metadata (rules count, last update)
    /// are passed in because they live on different services.
    ///
    /// - Parameters:
    ///   - protectionLevel: The persisted protection level.
    ///   - rulesCount: Number of rules in the active prefilter, if known.
    ///   - lastUpdate: Timestamp of the last prefilter update, if known.
    /// - Returns: A multi-line diagnostics section.
    func webProtectionSection(
        protectionLevel: URLFilterProtectionLevel,
        rulesCount: Int?,
        lastUpdate: Date?
    ) -> String {
        let levelName: String = {
            switch protectionLevel {
            case .essential: "essential"
            case .safe: "safe"
            case .family: "family"
            }
        }()
        let rulesCountLine = rulesCount.map(String.init) ?? "Unknown"
        let lastUpdateLine = lastUpdate.map(Self.lastUpdateFormatter.string(from:)) ?? "Unknown"
        let lastDisconnectError = self.lastDisconnectError.map { "\($0)" } ?? "None"

        return """
        System Wide Protection:
            Enabled: \(self.enabled ? "Yes" : "No")
            Protection level: \(levelName)
            Status: \(self.status)
            Rules count: \(rulesCountLine)
            Last update: \(lastUpdateLine)
            Last disconnect error: \(lastDisconnectError)
        """
    }

    /// Deterministic UTC formatter so the section (and its tests) do not depend
    /// on the local timezone.
    ///
    /// A computed property returns a fresh formatter per call: a shared static
    /// formatter could be used concurrently from multiple tasks and corrupt
    /// output or crash.
    private static var lastUpdateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter
    }
}
