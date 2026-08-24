// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UserRules+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension UserRules {
    public init(enabled: Bool = false, rules: [UserRule] = []) {
        self.init()
        self.enabled = enabled
        self.rules = rules
    }
}
