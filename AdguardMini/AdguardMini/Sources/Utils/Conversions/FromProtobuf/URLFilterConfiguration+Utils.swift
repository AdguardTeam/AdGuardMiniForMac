// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterConfiguration+Utils.swift
//  AdguardMini
//

import Foundation
import SciterSchema

extension SciterSchema.URLFilterConfiguration {
    /// Converts the UI-submitted Protobuf message to its pure Swift DTO.
    /// Unrecognized protection levels fall back to `.essential`.
    func toDTO() -> URLFilterConfigurationDTO {
        URLFilterConfigurationDTO(
            enabled: self.enabled,
            protectionLevel: self.protectionLevel.toSwift()
        )
    }
}
