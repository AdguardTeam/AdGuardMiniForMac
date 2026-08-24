// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterUIState+ToProto.swift
//  AdguardMini
//

import Foundation
import ProtoSchema

extension URLFilterUIState {
    /// Converts the pure Swift UI aggregate to its Protobuf message.
    func toProto() -> ProtoSchema.URLFilterState {
        ProtoSchema.URLFilterState(
            enabled: self.enabled,
            protectionLevel: self.protectionLevel.toProto(),
            status: self.status.toProto(),
            isInstalled: self.isInstalled,
            info: self.info.toProto()
        )
    }
}
