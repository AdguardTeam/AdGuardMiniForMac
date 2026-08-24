// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterInfo+ToProto.swift
//  AdguardMini
//

import Foundation
import ProtoSchema

extension URLFilterInfo {
    /// Maps the metadata to its Protobuf message, leaving optional fields unset when `nil`.
    func toProto() -> ProtoSchema.URLFilterInfo {
        ProtoSchema.URLFilterInfo(
            rulesCount: self.rulesCount.map(UInt32.init),
            lastUpdate: self.lastUpdate.map { Int64($0.timeIntervalSince1970) }
        )
    }
}
