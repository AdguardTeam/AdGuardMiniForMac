// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ThirdPartyDependency+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension ThirdPartyDependency {
    public init(name: String = "", version: String = "") {
        self.init()
        self.name = name
        self.version = version
    }
}
