// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Settings+DTO.swift
//  AdguardMini
//

import Foundation

struct SettingsDTO: Codable, Equatable {
    let autoFiltersUpdate: Bool
    let realTimeFiltersUpdate: Bool
    let debugLogging: Bool
    let hardwareAcceleration: Bool
    let launchOnStartup: Bool
    let showInMenuBar: Bool
    let quitReaction: QuitReaction
    let theme: Theme
    let showSafariToolbarBadge: Bool
}
