// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStatusInfo+ToProto.swift
//  AdguardMini
//

import Foundation
import SciterSchema

extension AppStatusInfo {
    func toProto(canReset: Bool) -> LicenseOrError {
        LicenseOrError(
            license: License(
                validUntil: Int64(self.expirationDate?.timeIntervalSince1970 ?? 0),
                renewalDate: Int64(
                    self.subscriptionStatus?.nextBillDate.timeIntervalSince1970
                        ?? self.expirationDate?.timeIntervalSince1970
                        ?? 0
                ),
                licenseKey: self.applicationKey ?? "",
                currentDevices: Int32(self.licenseComputersCount ?? 0),
                totalDevices: Int32(self.licenseMaxComputersCount ?? 0),
                status: self.licenseStatus.toProto(),
                type: self.licenseType?.toProto() ?? .unknown,
                applicationKeyOwner: self.applicationKeyOwner ?? "",
                licenseLifetime: self.licenseLifetime ?? false,
                licenseTrial: self.licenseTrial ?? false,
                appStoreSubscription: self.isAppStoreSubscription,
                canReset: canReset
            )
        )
    }

    /// Produces a lightweight `TrayLicense` for the tray module.
    func toTrayLicense() -> TrayLicense {
        TrayLicense(
            hasLicense: self.applicationKey != nil,
            status: self.licenseStatus.toProto(),
            applicationKeyOwner: self.applicationKeyOwner ?? "",
            appStoreSubscription: self.isAppStoreSubscription
        )
    }
}

// swiftlint:disable switch_case_on_newline

extension AppStatusInfo.LicenseStatus {
    func toProto() -> SciterSchema.LicenseStatus {
        switch self {
        case .active:          .active
        case .alreadyActivate: .alreadyActivate
        case .blocked:         .blocked
        case .blockedAppId:    .blockedAppID
        case .expired:         .expired
        case .free:            .free
        case .trial:           .trial
        case .uninstall:       .uninstall
        case .wrongKey:        .wrongKey
        }
    }
}

extension AppStatusInfo.LicenseType {
    func toProto() -> SciterSchema.LicenseType {
        switch self {
        case .beta:     .beta
        case .bonus:    .bonus
        case .family:   .family
        case .mobile:   .mobile
        case .personal: .personal
        case .premium:  .premium
        case .standard: .standard
        }
    }
}

// swiftlint:enable switch_case_on_newline
