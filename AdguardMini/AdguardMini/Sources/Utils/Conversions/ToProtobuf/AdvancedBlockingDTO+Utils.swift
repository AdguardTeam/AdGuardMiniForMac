// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AdvancedBlockingDTO+Utils.swift
//  AdguardMini
//

import Foundation
import ProtoSchema

extension AdvancedBlockingDTO {
    func toProto(realTimeFiltersUpdate: Bool) -> AdvancedBlocking {
        AdvancedBlocking(
            advancedRules: self.advancedRules,
            adguardExtra: self.adguardExtra,
            mailProtectionEnabled: false,
            realTimeFiltersUpdate: realTimeFiltersUpdate
        )
    }
}
