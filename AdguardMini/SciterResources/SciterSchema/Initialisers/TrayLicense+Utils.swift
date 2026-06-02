// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TrayLicense+Utils.swift
//  SciterSchema
//

import Foundation
import BaseSciterSchema

extension TrayLicense {
    public init(
        hasLicense: Bool = false,
        status: LicenseStatus = .unknown,
        applicationKeyOwner: String = "",
        appStoreSubscription: Bool = false
    ) {
        self.init()
        self.hasLicense_p = hasLicense
        self.status = status
        self.applicationKeyOwner = applicationKeyOwner
        self.appStoreSubscription = appStoreSubscription
    }
}
