// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  OptionalError.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension OptionalError {
    public init(hasError: Bool = false, message: String? = nil) {
        self.init()
        self.hasError_p = hasError
        self.message = message ?? ""
    }
}
