// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UserRulesCallbackState+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension UserRulesCallbackState {
    public init (rules: [UserRule] = []) {
        self.init()
        self.rules = rules
    }
}
