// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SiteReportState.swift
//  AdguardMini
//

import Foundation

import AppBackend

/// The application state sent along with a site report.
struct SiteReportState: Sendable {
    /// The screen from which the report is made.
    let screen: String
    /// The reported page URL, if any.
    let pageUrl: String?
    /// Whether the user has a paid license.
    let isPaid: Bool
    /// Identifiers of the enabled regular filters.
    let enabledFilterIds: [Int]
    /// The enabled custom filters.
    let customFilters: [SiteReport.CustomFilter]
    /// The user extensions.
    let extensions: [SiteReport.Extension]
    /// Whether the user extensions are enabled.
    let extensionsEnabled: Bool
    /// Whether advanced rules are enabled.
    let advancedRules: Bool
    /// The last filters update time.
    let lastFiltersUpdate: Date
    /// Whether language-specific ad blocking is enabled; always sent, never omitted.
    let languageSpecificAdblocking: Bool
}
