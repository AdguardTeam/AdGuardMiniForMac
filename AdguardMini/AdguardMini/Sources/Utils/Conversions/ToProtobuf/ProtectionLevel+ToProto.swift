// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ProtectionLevel+ToProto.swift
//  AdguardMini
//

// swiftlint:disable switch_case_on_newline

import Foundation
import ProtoSchema

extension URLFilterProtectionLevel {
    /// Maps the Swift protection level to its Protobuf enum value.
    func toProto() -> ProtoSchema.URLFilterProtectionLevel {
        switch self {
        case .essential: .essential
        case .safe:      .safe
        case .family:    .family
        }
    }
}

// swiftlint:enable switch_case_on_newline
