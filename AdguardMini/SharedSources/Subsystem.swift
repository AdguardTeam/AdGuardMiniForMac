// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Subsystem.swift
//  AdguardMini
//

import Foundation

/// All available subsystems of app.
enum Subsystem: CaseIterable {
    /// Main App subsystem name.
    case mainApp
    /// Safari Popup subsystem name.
    case safariPopup
    /// Helper subsystem name.
    case helper

    // Content blockers

    case cbGeneral
    case cbPrivacy
    case cbSecurity
    case cbSocial
    case cbOther
    case cbCustom

    var name: String {
        switch self {
        case .mainApp:
            BuildConfig.AG_APP_ID
        case .safariPopup:
            BuildConfig.AG_POPUP_EXTENSION_BUNDLEID
        case .helper:
            BuildConfig.AG_HELPER_ID
        case .cbGeneral:
            BuildConfig.AG_BLOCKER_GENERAL_BUNDLEID
        case .cbPrivacy:
            BuildConfig.AG_BLOCKER_PRIVACY_BUNDLEID
        case .cbSecurity:
            BuildConfig.AG_BLOCKER_SECURITY_BUNDLEID
        case .cbSocial:
            BuildConfig.AG_BLOCKER_SOCIAL_BUNDLEID
        case .cbOther:
            BuildConfig.AG_BLOCKER_OTHER_BUNDLEID
        case .cbCustom:
            BuildConfig.AG_BLOCKER_CUSTOM_BUNDLEID
        }
    }

    /// Array with the names of all subsystems used by the application, including the application itself.
    static var allSubsystems: [String] {
        Self.allCases.map { $0.name }
    }
}
