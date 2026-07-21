// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStatus+ToProto.swift
//  AdguardMini
//

// swiftlint:disable switch_case_on_newline

import Foundation
import SciterSchema

extension URLFilterStatus {
    /// Maps the derived status to its Protobuf enum value (without the error text).
    func toProto() -> SciterSchema.URLFilterStatus {
        switch self {
        case .unknown:  .unknown
        case .disabled: .disabled
        case .invalid:  .invalid
        case .stopped:  .stopped
        case .starting: .starting
        case .running:  .running
        case .stopping: .stopping
        }
    }
}

// swiftlint:enable switch_case_on_newline
