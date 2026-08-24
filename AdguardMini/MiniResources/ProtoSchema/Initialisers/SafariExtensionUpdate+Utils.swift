// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensionUpdate+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension SafariExtensionUpdate {
    public init(
        type: SafariExtensionType,
        state: SafariExtension = SafariExtension()
    ) {
        self.init()
        self.type = type
        self.state = state
    }
}
