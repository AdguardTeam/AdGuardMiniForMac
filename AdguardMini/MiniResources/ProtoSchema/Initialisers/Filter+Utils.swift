// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Filter+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension Filter {
    public init(
        id: Int32 = 0,
        groupID: Int32 = 0,
        enabled: Bool = false,
        timeUpdated: Int64 = 0,
        title: String = "",
        description_p: String = "",
        version: String = "",
        homepage: String = "",
        rulesCount: Int32 = 0,
        languages: [String] = [],
        trusted: Bool = false
    ) {
        self.init()
        self.id = id
        self.groupID = groupID
        self.enabled = enabled
        self.timeUpdated = timeUpdated
        self.title = title
        self.description_p = description_p
        self.version = version
        self.homepage = homepage
        self.rulesCount = rulesCount
        self.languages = languages
        self.trusted = trusted
    }
}
