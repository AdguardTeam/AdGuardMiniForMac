// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FiltersStatus+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension FiltersStatus {
    public init(status: [FilterUpdateStatus] = [], error: Bool = false) {
        self.init()
        self.status = status
        self.error = error
    }
}

extension FilterUpdateStatus {
    public init(id: Int32 = 0, success: Bool = false, version: String = "") {
        self.init()
        self.id = id
        self.success = success
        self.version = version
    }

}
