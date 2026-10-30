// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ApplicationVersionStatus+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension ApplicationVersionStatus {
    public init(
        available: Bool = false,
        version: String = ""
    ) {
        self.init()
        self.available = available
        self.version = version
    }
}
