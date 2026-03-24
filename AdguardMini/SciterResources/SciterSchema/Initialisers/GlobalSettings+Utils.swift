// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  GlobalSettings+Utils.swift
//  SciterSchema
//

import Foundation
import BaseSciterSchema

extension GlobalSettings {
    public init(
        enabled: Bool = false,
        allExtensionEnabled: Bool = false,
        newVersionAvailable: Bool = false,
        releaseVariant: ReleaseVariants = .standAlone,
        language: String = "",
        debugLogging: Bool = false,
        allowTelemetry: Bool = false,
        theme: Theme
    ) {
        self.init()
        self.enabled = enabled
        self.allExtensionEnabled = allExtensionEnabled
        self.newVersionAvailable = newVersionAvailable
        self.releaseVariant = releaseVariant
        self.language = language
        self.debugLogging = debugLogging
        self.allowTelemetry = allowTelemetry
        self.theme = theme
    }
}
