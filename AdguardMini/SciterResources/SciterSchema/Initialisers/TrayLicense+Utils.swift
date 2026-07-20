// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TrayLicense+Utils.swift
//  SciterSchema
//

import Foundation

extension TrayLicense {
    public init(
        status: LicenseStatus = .unknown,
        applicationKeyOwner: String = "",
        appStoreSubscription: Bool
    ) {
        self.init()
        self.status = status
        self.applicationKeyOwner = applicationKeyOwner
        self.appStoreSubscription = appStoreSubscription
    }
}
