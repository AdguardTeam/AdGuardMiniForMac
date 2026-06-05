// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ContentBlockerTypeMapping.swift
//  AdguardMini
//

import ContentBlockerConverter

// MARK: - Content blocker type mapping helpers

/// Bridges between library ContentBlockerType, app SafariBlockerType, and FiltersDefinedGroup.
/// Centralizes the mapping logic that was previously duplicated across SafariConverter and FiltersServiceImpl.
extension ContentBlockerType {
    /// Maps a filter group identifier to a content blocker type.
    static func from(groupId: Int) -> ContentBlockerType? {
        let groupMapping: [(ContentBlockerType, [FiltersDefinedGroup])] = [
            (.general, [.adBlocking, .languageSpecific]),
            (.privacy, [.privacy]),
            (.security, [.security]),
            (.socialWidgetsAndAnnoyances, [.social, .annoyances]),
            (.other, [.other]),
            (.custom, [.custom])
        ]

        for (contentBlockerType, groups) in groupMapping
        where groups.contains(where: { $0.id == groupId }) {
            return contentBlockerType
        }

        return nil
    }

    /// Maps content blocker type to filter groups.
    var filtersGroups: [FiltersDefinedGroup] {
        switch self {
        case .general: [.adBlocking, .languageSpecific]
        case .privacy: [.privacy]
        case .security: [.security]
        case .socialWidgetsAndAnnoyances: [.social, .annoyances]
        case .other: [.other]
        case .custom: [.custom]
        }
    }
}

extension SafariBlockerType {
    /// Bridges the library content blocker type to the app's blocker type.
    init(_ contentBlockerType: ContentBlockerType) {
        switch contentBlockerType {
        case .general: self = .general
        case .privacy: self = .privacy
        case .security: self = .security
        case .socialWidgetsAndAnnoyances: self = .socialWidgetsAndAnnoyances
        case .other: self = .other
        case .custom: self = .custom
        }
    }

    /// Maps Safari blocker type to filter groups.
    var filtersGroups: [FiltersDefinedGroup] {
        ContentBlockerType(from: self)?.filtersGroups ?? []
    }
}

private extension ContentBlockerType {
    /// Reverse mapping from SafariBlockerType to ContentBlockerType.
    init?(from safariBlockerType: SafariBlockerType) {
        switch safariBlockerType {
        case .general: self = .general
        case .privacy: self = .privacy
        case .security: self = .security
        case .socialWidgetsAndAnnoyances: self = .socialWidgetsAndAnnoyances
        case .other: self = .other
        case .custom: self = .custom
        case .advanced: return nil
        }
    }
}
