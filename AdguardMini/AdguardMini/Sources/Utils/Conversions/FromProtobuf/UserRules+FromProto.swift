// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UserRules+ToFromProto.swift
//  AdguardMini
//

import FLM
import ProtoSchema

extension UserRule {
    func fromProto() -> FilterRule {
        FilterRule(
            ruleText: self.rule,
            isEnabled: self.enabled
        )
    }
}

extension [UserRule] {
    func fromProto() -> [FilterRule] {
        self.map { $0.fromProto() }
    }
}
