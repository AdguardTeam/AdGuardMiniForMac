// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AdvancedBlocking+Utils.swift
//  AdguardMini
//

import Foundation
import ProtoSchema

extension ProtoSchema.AdvancedBlocking {
    func toDTO() -> AdvancedBlockingDTO {
        AdvancedBlockingDTO(
            advancedRules: self.advancedRules,
            adguardExtra: self.adguardExtra
        )
    }
}
