// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  CurrentExtensionState+Utlis.swift
//  AdguardMini
//

import ProtoSchema

extension CurrentExtensionState {
    func toProto() -> SafariExtensionUpdate {
        SafariExtensionUpdate(
            type: self.type.toProto(),
            state: self.toProto()
        )
    }

    func toProto() -> ProtoSchema.SafariExtension {
        ProtoSchema.SafariExtension(
            id: self.type.bundleId,
            rulesEnabled: Int32(self.state.rulesInfo.safariRulesCount),
            rulesTotal: Int32(self.state.rulesInfo.sourceSafariCompatibleRulesCount),
            status: self.status.toProto(),
            isConsideredEnabled: self.status.isConsideredEnabled
        )
    }
}
