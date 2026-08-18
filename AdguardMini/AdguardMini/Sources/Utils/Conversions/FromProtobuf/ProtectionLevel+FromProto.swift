// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ProtectionLevel+FromProto.swift
//  AdguardMini
//

// Improve readability
// swiftlint:disable switch_case_on_newline

import Foundation
import SciterSchema

extension SciterSchema.URLFilterProtectionLevel {
    /// Maps the Protobuf protection level to its Swift enum value.
    /// Unrecognized values fall back to ``URLFilterProtectionLevel/essential``.
    func toSwift() -> URLFilterProtectionLevel {
        switch self {
        case .essential: .essential
        case .safe:      .safe
        case .family:    .family
        default:         .essential
        }
    }
}

// swiftlint:enable switch_case_on_newline
