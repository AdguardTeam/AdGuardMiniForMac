// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  License+Utils.swift
//  SciterSchema
//

import Foundation

extension License {
    public init(
        validUntil: Int64 = 0,
        renewalDate: Int64 = 0,
        licenseKey: String = "",
        currentDevices: Int32 = 0,
        totalDevices: Int32 = 0,
        status: LicenseStatus = .unknown,
        type: LicenseType = .unknown,
        applicationKeyOwner: String = "",
        licenseLifetime: Bool = false,
        licenseTrial: Bool = false,
        appStoreSubscription: Bool,
        canReset: Bool
    ) {
        self.init()
        self.validUntil = validUntil
        self.renewalDate = renewalDate
        self.licenseKey = licenseKey
        self.currentDevices = currentDevices
        self.totalDevices = totalDevices
        self.status = status
        self.type = type
        self.applicationKeyOwner = applicationKeyOwner
        self.licenseLifetime = licenseLifetime
        self.licenseTrial = licenseTrial
        self.appStoreSubscription = appStoreSubscription
        self.canReset = canReset
    }
}
