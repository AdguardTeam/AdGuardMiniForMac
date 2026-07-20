// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AdvancedBlocking+Utils.swift
//  SciterSchema
//

import Foundation
import BaseSciterSchema

extension AdvancedBlocking {
    public init(
        advancedRules: Bool = false,
        adguardExtra: Bool = false,
        mailProtectionEnabled: Bool = false,
        realTimeFiltersUpdate: Bool = false,
    ) {
        self.init()
        self.advancedRules = advancedRules
        self.adguardExtra = adguardExtra
        self.mailProtectionEnabled = mailProtectionEnabled
        self.realTimeFiltersUpdate = realTimeFiltersUpdate
    }
}
