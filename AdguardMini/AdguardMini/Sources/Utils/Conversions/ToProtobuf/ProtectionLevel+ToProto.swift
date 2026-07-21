// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ProtectionLevel+ToProto.swift
//  AdguardMini
//

// swiftlint:disable switch_case_on_newline

import Foundation
import SciterSchema

extension URLFilterProtectionLevel {
    /// Maps the Swift protection level to its Protobuf enum value.
    func toProto() -> SciterSchema.URLFilterProtectionLevel {
        switch self {
        case .essential: .essential
        case .safe:      .safe
        case .family:    .family
        }
    }

    /// Creates a Swift protection level from its Protobuf enum value.
    /// Unrecognized values fall back to ``URLFilterProtectionLevel/essential``.
    init(proto: SciterSchema.URLFilterProtectionLevel) {
        switch proto {
        case .essential: self = .essential
        case .safe:      self = .safe
        case .family:    self = .family
        default:         self = .essential
        }
    }
}

// swiftlint:enable switch_case_on_newline
