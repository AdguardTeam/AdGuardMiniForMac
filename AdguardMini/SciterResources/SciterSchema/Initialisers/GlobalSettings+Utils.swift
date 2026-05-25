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
        newVersionAvailable: Bool = false,
        releaseVariant: ReleaseVariants = .standAlone,
        language: String = "",
        debugLogging: Bool = false,
        allowTelemetry: Bool = false,
        theme: Theme,
        lastFiltersUpdateTimestampMs: Int64 = 0
    ) {
        self.init()
        self.enabled = enabled
        self.newVersionAvailable = newVersionAvailable
        self.releaseVariant = releaseVariant
        self.language = language
        self.debugLogging = debugLogging
        self.allowTelemetry = allowTelemetry
        self.theme = theme
        self.lastFiltersUpdateTimestampMs = lastFiltersUpdateTimestampMs
    }
}
