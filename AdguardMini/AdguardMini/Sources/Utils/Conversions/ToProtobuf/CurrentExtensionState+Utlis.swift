// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  CurrentExtensionState+Utlis.swift
//  AdguardMini
//

import SciterSchema

extension CurrentExtensionState {
    func toProto() -> SafariExtensionUpdate {
        SafariExtensionUpdate(
            type: self.type.toProto(),
            state: self.toProto()
        )
    }

    func toProto() -> SciterSchema.SafariExtension {
        SciterSchema.SafariExtension(
            id: self.type.bundleId,
            rulesEnabled: Int32(self.state.rulesInfo.safariRulesCount),
            rulesTotal: Int32(self.state.rulesInfo.sourceSafariCompatibleRulesCount),
            status: self.status.toProto(),
            isConsideredEnabled: self.status.isConsideredEnabled
        )
    }
}
