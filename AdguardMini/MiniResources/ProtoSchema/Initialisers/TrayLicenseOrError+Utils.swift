// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TrayLicenseOrError+Utils.swift
//  ProtoSchema
//

import Foundation

extension TrayLicenseOrError {
    public init(license: TrayLicense) {
        self.init()
        self.license = license
    }

    public static var licenseError: TrayLicenseOrError {
        var val = TrayLicenseOrError()
        val.error = true
        return val
    }
}
