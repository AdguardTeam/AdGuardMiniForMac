// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FilterRule+ToProto.swift
//  AdguardMini
//

import FLM
import ProtoSchema

extension FilterRule {
    func toProto() -> UserRule {
        UserRule(
            rule: self.ruleText,
            enabled: self.isEnabled
        )
    }
}

extension [FilterRule] {
    func toProto() -> [UserRule] {
        self.map { $0.toProto() }
    }
}
