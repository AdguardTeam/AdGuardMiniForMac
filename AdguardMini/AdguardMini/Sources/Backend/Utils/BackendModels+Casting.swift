// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  BackendModels+Casting.swift
//  AdguardMini
//

import AppBackend

// swiftlint:disable switch_case_on_newline

extension AppStatusResponse {
    func toAppStatus() -> AppStatusInfo {
        AppStatusInfo(
            licenseStatus:            self.licenseStatus.toAppDomain(),
            expirationDate:           self.expirationDate,
            daysToExpire:             self.daysToExpire,
            applicationKey:           self.applicationKey,
            applicationKeyStatus:     self.applicationKeyStatus?.toAppDomain(),
            applicationKeyOwner:      self.applicationKeyOwner,
            licenseType:              self.licenseType?.toAppDomain(),
            licenseTrial:             self.licenseTrial,
            licenseLifetime:          self.licenseLifetime,
            licenseMaxComputersCount: self.licenseMaxComputersCount,
            licenseComputersCount:    self.licenseComputersCount,
            licensePrice:             self.licensePrice,
            discountText:             self.discountText,
            buyUrl:                   self.buyUrl,
            subscriptionStatus:       self.subscriptionStatus?.toAppDomain()
        )
    }
}

extension AppStatusResponse.LicenseStatus {
    func toAppDomain() -> AppStatusInfo.LicenseStatus {
        switch self {
        case .active:          .active
        case .expired:         .expired
        case .trial:           .trial
        case .uninstall:       .uninstall
        case .free:            .free
        case .blockedAppId:    .blockedAppId
        case .wrongKey:        .wrongKey
        case .alreadyActivate: .alreadyActivate
        case .blocked:         .blocked
        }
    }
}

extension ApplicationKeyStatus {
    func toAppDomain() -> AppStatusInfo.ApplicationKeyStatus {
        switch self {
        case .valid:              .valid
        case .expired:            .expired
        case .notExists:          .notExists
        case .maxComputersExceed: .maxComputersExceed
        case .blocked:            .blocked
        }
    }
}

extension LicenseType {
    func toAppDomain() -> AppStatusInfo.LicenseType {
        switch self {
        case .personal: .personal
        case .family:   .family
        case .standard: .standard
        case .mobile:   .mobile
        case .premium:  .premium
        case .beta:     .beta
        case .bonus:    .bonus
        }
    }
}

extension SubscriptionStatusDetail {
    func toAppDomain() -> AppStatusInfo.SubscriptionStatusDetail {
        .init(
            status: self.status.toAppDomain(),
            duration: self.duration.toAppDomain(),
            nextBillDate: self.nextBillDate,
            inAppPaymentSystem: self.inAppPaymentSystem?.toAppDomain()
        )
    }
}

extension SubscriptionStatus {
    func toAppDomain() -> AppStatusInfo.SubscriptionStatusDetail.Status {
        switch self {
        case .active:  .active
        case .pastDue: .pastDue
        case .paused:  .paused
        case .deleted: .deleted
        }
    }
}

extension SubscriptionDuration {
    func toAppDomain() -> AppStatusInfo.SubscriptionStatusDetail.Duration {
        switch self {
        case .monthly: .monthly
        case .yearly:  .yearly
        }
    }
}

extension InAppPaymentSystem {
    func toAppDomain() -> AppStatusInfo.SubscriptionStatusDetail.InAppPaymentSystem {
        switch self {
        case .appleAppStore: .appleAppStore
        case .googlePlay:    .googlePlay
        }
    }
}

extension AppStatusResponse.ExtendedTrialInfo {
    func toAppDomain() -> TrialInfo {
        TrialInfo(
            isAvailable: self.isAvailable,
            durationDays: self.durationDays
        )
    }
}

// swiftlint:enable switch_case_on_newline
