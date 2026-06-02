// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Filters+Utils.swift
//  SciterSchema
//

import Foundation
import BaseSciterSchema

extension Filters {
    public init(filters: [Filter] = [], customFilters: [Filter] = [], languageSpecific: Bool = false) {
        self.init()
        self.filters = filters
        self.customFilters = customFilters
        self.languageSpecific = languageSpecific
    }
}
