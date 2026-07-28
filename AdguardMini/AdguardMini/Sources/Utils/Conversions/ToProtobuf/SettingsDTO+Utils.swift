// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SettingsDTO+Utils.swift
//  AdguardMini
//

import Foundation
import SciterSchema

extension ReleaseVariant {
    func toProto() -> SciterSchema.ReleaseVariants {
        switch self {
        case .MAS:        .mas
        case .standalone: .standAlone
        }
    }
}

extension SettingsDTO {
    // The function is used to convert SettingsDTO to protobuf Settings object, which has many fields.
    // swiftlint:disable:next function_parameter_count
    func toProto(
        userConsent: [Int],
        releaseVariant: ReleaseVariant,
        language: String,
        allowTelemetry: Bool,
        lastUpdateMoreSevenDays: Bool,
        loginItemEnabled: Bool
    ) -> Settings {
        Settings(
            launchOnStartup:         self.launchOnStartup,
            showInMenuBar:           self.showInMenuBar,
            hardwareAcceleration:    self.hardwareAcceleration,
            autoFiltersUpdate:       self.autoFiltersUpdate,
            realTimeFiltersUpdate:   self.realTimeFiltersUpdate,
            debugLogging:            self.debugLogging,
            quitReaction:            self.quitReaction.toProto(),
            theme:                   self.theme.toProto(),
            consentFiltersIds:       userConsent.map(Int32.init),
            releaseVariant:          releaseVariant.toProto(),
            language:                language,
            allowTelemetry:          allowTelemetry,
            showSafariToolbarBadge:  self.showSafariToolbarBadge,
            lastUpdateMoreSevenDays: lastUpdateMoreSevenDays,
            loginItemEnabled:        loginItemEnabled
        )
    }
}
