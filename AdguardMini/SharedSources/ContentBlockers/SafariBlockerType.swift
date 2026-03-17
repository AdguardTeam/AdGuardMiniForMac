// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariBlockerType.swift
//  AdguardMini
//

import Foundation

enum SafariBlockerType: String, Codable, CaseIterable {
    case general
    case privacy
    case security
    case socialWidgetsAndAnnoyances
    case other
    case custom
    case advanced

    /// Gets corresponding safari extension bundle id string for groupKey value
    var bundleId: String {
        switch self {
        case .general:
            BuildConfig.AG_BLOCKER_GENERAL_BUNDLEID
        case .privacy:
            BuildConfig.AG_BLOCKER_PRIVACY_BUNDLEID
        case .security:
            BuildConfig.AG_BLOCKER_SECURITY_BUNDLEID
        case .socialWidgetsAndAnnoyances:
            BuildConfig.AG_BLOCKER_SOCIAL_BUNDLEID
        case .other:
            BuildConfig.AG_BLOCKER_OTHER_BUNDLEID
        case .custom:
            BuildConfig.AG_BLOCKER_CUSTOM_BUNDLEID
        case .advanced:
            BuildConfig.AG_POPUP_EXTENSION_BUNDLEID
        }
    }

    // MARK: Init

    /// Creates a SafariBlockerType from a Content Blocker bundle identifier
    /// - Parameter contentBlockerIdentifier: Bundle ID string from Safari callback
    /// - Returns: Matching blocker type, or nil if unknown or not a Content Blocker
    init?(contentBlockerIdentifier: String) {
        switch contentBlockerIdentifier {
        case BuildConfig.AG_BLOCKER_GENERAL_BUNDLEID:
            self = .general
        case BuildConfig.AG_BLOCKER_PRIVACY_BUNDLEID:
            self = .privacy
        case BuildConfig.AG_BLOCKER_SECURITY_BUNDLEID:
            self = .security
        case BuildConfig.AG_BLOCKER_SOCIAL_BUNDLEID:
            self = .socialWidgetsAndAnnoyances
        case BuildConfig.AG_BLOCKER_OTHER_BUNDLEID:
            self = .other
        case BuildConfig.AG_BLOCKER_CUSTOM_BUNDLEID:
            self = .custom
        default:
            return nil
        }
    }
}
