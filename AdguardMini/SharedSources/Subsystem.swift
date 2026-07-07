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
    /// Mail content blocker subsystem name.
    case mailBlocker

    var name: String {
        switch self {
        case .mainApp:
            BuildConfig.AG_APP_ID
        case .safariPopup:
            BuildConfig.AG_POPUP_EXTENSION_BUNDLEID
        case .helper:
            BuildConfig.AG_HELPER_ID
        case .mailBlocker:
            BuildConfig.AG_MAIL_EXTENSION_BUNDLEID
        }
    }

    /// Array with the names of all subsystems used by the application, including the application itself.
    static var allSubsystems: [String] {
        Self.allCases.map { $0.name }
    }
}
