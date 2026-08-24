// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LicenseOrError+Utils.swift
//  ProtoSchema
//

import Foundation

extension LicenseOrError {
    public init(license: License) {
        self.init()
        self.license = license
    }

    public static var licenseError: LicenseOrError {
        var val = LicenseOrError()
        val.error = true
        return val
    }
}
