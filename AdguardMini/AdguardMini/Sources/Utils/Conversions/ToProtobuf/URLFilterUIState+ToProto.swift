// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterUIState+ToProto.swift
//  AdguardMini
//

import Foundation
import SciterSchema

extension URLFilterUIState {
    /// Converts the pure Swift UI aggregate to its Protobuf message.
    func toProto() -> SciterSchema.URLFilterState {
        SciterSchema.URLFilterState(
            status: self.status.toProto(),
            configuration: SciterSchema.URLFilterConfiguration(
                enabled: self.enabled,
                protectionLevel: self.protectionLevel.toProto()
            ),
            info: self.info.toProto(),
            errorMessage: self.errorMessage,
            isNew: self.isNew,
            isPageNew: self.isPageNew
        )
    }
}
