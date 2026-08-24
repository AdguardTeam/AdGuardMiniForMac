// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterUIStatus+ToProto.swift
//  AdguardMini
//

// swiftlint:disable switch_case_on_newline

import Foundation
import ProtoSchema

extension URLFilterUIStatus {
    /// Maps the derived status to its Protobuf enum value (without the error text).
    func toProto() -> ProtoSchema.URLFilterStatus {
        switch self {
        case .error:   .error
        case .loading: .loading
        case .running: .running
        }
    }
}

// swiftlint:enable switch_case_on_newline
