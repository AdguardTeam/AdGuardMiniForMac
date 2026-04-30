// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Settings+Utils.swift
//  SciterSchema
//

import Foundation
import BaseSciterSchema

extension Settings {
    public init(
        launchOnStartup: Bool = false,
        showInMenuBar: Bool = false,
        hardwareAcceleration: Bool = false,
        autoFiltersUpdate: Bool = false,
        realTimeFiltersUpdate: Bool = false,
        debugLogging: Bool = false,
        quitReaction: QuitReaction = .ask,
        theme: Theme,
        consentFiltersIds: [Int32] = [],
        releaseVariant: ReleaseVariants = .standAlone,
        language: String = "",
        allowTelemetry: Bool = false,
        showSafariToolbarBadge: Bool = false
    ) {
        self.init()
        self.launchOnStartup = launchOnStartup
        self.showInMenuBar = showInMenuBar
        self.hardwareAcceleration = hardwareAcceleration
        self.autoFiltersUpdate = autoFiltersUpdate
        self.realTimeFiltersUpdate = realTimeFiltersUpdate
        self.debugLogging = debugLogging
        self.quitReaction = quitReaction
        self.theme = theme
        self.consentFiltersIds = consentFiltersIds
        self.releaseVariant = releaseVariant
        self.language = language
        self.allowTelemetry = allowTelemetry
        self.showSafariToolbarBadge = showSafariToolbarBadge
    }
}
