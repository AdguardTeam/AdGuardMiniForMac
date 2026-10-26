// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Settings+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension Settings {
    public init(
        launchOnStartup: Bool = false,
        showInMenuBar: Bool = false,
        hardwareAcceleration: Bool = false,
        autoFiltersUpdate: Bool = false,
        debugLogging: Bool = false,
        quitReaction: QuitReaction = .ask,
        theme: Theme,
        consentFiltersIds: [Int32] = [],
        releaseVariant: ReleaseVariants = .standAlone,
        language: String = "",
        allowTelemetry: Bool = false,
        showSafariToolbarBadge: Bool = false,
        lastUpdateMoreSevenDays: Bool = false,
        loginItemEnabled: Bool = false,
        non501User: Bool = false,
        macos25OrLower: Bool = false,
        reportProblemLabelShown: Bool = false,
        protectionEnabled: Bool = false,
        experimentalSystemWideProtectionEnabled: Bool = false,
        isMacos272: Bool = false,
    ) {
        self.init()
        self.launchOnStartup = launchOnStartup
        self.showInMenuBar = showInMenuBar
        self.hardwareAcceleration = hardwareAcceleration
        self.autoFiltersUpdate = autoFiltersUpdate
        self.debugLogging = debugLogging
        self.quitReaction = quitReaction
        self.theme = theme
        self.consentFiltersIds = consentFiltersIds
        self.releaseVariant = releaseVariant
        self.language = language
        self.allowTelemetry = allowTelemetry
        self.showSafariToolbarBadge = showSafariToolbarBadge
        self.lastUpdateMoreSevenDays = lastUpdateMoreSevenDays
        self.loginItemEnabled = loginItemEnabled
        self.non501User = non501User
        self.macos25OrLower = macos25OrLower
        self.reportProblemLabelShown = reportProblemLabelShown
        self.protectionEnabled = protectionEnabled
        self.experimentalSystemWideProtectionEnabled = experimentalSystemWideProtectionEnabled
        self.isMacos272 = isMacos272
    }
}
