// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStatusInfo.swift
//  AdguardMini
//

import Foundation

final class AppStatusInfo: NSObject, NSSecureCoding, @unchecked Sendable {
    static var supportsSecureCoding: Bool { true }

    /// Application status.
    private(set) var licenseStatus: LicenseStatus
    /// Trial or license expiration date.
    private(set) var expirationDate: Date?
    /// Days to trial or license expire.
    private(set) var daysToExpire: Int
    /// Application license key.
    private(set) var applicationKey: String?
    /// Application license key status.
    private(set) var applicationKeyStatus: ApplicationKeyStatus?
    /// Email of the license key owner.
    private(set) var applicationKeyOwner: String?
    /// License key type.
    private(set) var licenseType: LicenseType?
    // swiftlint:disable discouraged_optional_boolean
    /// Is license a trial.
    private(set) var licenseTrial: Bool?
    /// Is lifetime license.
    private(set) var licenseLifetime: Bool?
    // swiftlint:enable discouraged_optional_boolean
    /// Maximum number of apps that could be activated by this license key.
    private(set) var licenseMaxComputersCount: Int?
    /// Number of apps which are using this license now.
    private(set) var licenseComputersCount: Int?
    /// License price (set by distributor).
    private(set) var licensePrice: String?
    /// Discount text (set by distributor).
    private(set) var discountText: String?
    /// Buy URL (set by distributor).
    private(set) var buyUrl: String?
    /// Subscription status.
    private(set) var subscriptionStatus: SubscriptionStatusDetail?

    init(
        licenseStatus: LicenseStatus,
        expirationDate: Date? = nil,
        daysToExpire: Int,
        applicationKey: String? = nil,
        applicationKeyStatus: ApplicationKeyStatus? = nil,
        applicationKeyOwner: String? = nil,
        licenseType: LicenseType? = nil,
        // swiftlint:disable:next discouraged_optional_boolean
        licenseTrial: Bool? = nil,
        // swiftlint:disable:next discouraged_optional_boolean
        licenseLifetime: Bool? = nil,
        licenseMaxComputersCount: Int? = nil,
        licenseComputersCount: Int? = nil,
        licensePrice: String? = nil,
        discountText: String? = nil,
        buyUrl: String? = nil,
        subscriptionStatus: SubscriptionStatusDetail? = nil
    ) {
        self.licenseStatus = licenseStatus
        self.expirationDate = expirationDate
        self.daysToExpire = daysToExpire
        self.applicationKey = applicationKey
        self.applicationKeyStatus = applicationKeyStatus
        self.applicationKeyOwner = applicationKeyOwner
        self.licenseType = licenseType
        self.licenseTrial = licenseTrial
        self.licenseLifetime = licenseLifetime
        self.licenseMaxComputersCount = licenseMaxComputersCount
        self.licenseComputersCount = licenseComputersCount
        self.licensePrice = licensePrice
        self.discountText = discountText
        self.buyUrl = buyUrl
        self.subscriptionStatus = subscriptionStatus
    }

    required init?(coder: NSCoder) {
        guard let licenseStatusRaw = coder.decodeObject(of: NSString.self, forKey: "licenseStatus") as String?,
              let licenseStatus = LicenseStatus(rawValue: licenseStatusRaw) else {
            return nil
        }
        self.licenseStatus         = licenseStatus
        self.expirationDate        = coder.decodeObject(of: NSDate.self, forKey: "expirationDate") as Date?
        self.daysToExpire          = coder.decodeInteger(forKey: "daysToExpire")
        self.applicationKey        = coder.decodeObject(of: NSString.self, forKey: "applicationKey") as String?
        self.licenseTrial          = coder.decodeObject(of: NSNumber.self, forKey: "licenseTrial") as? Bool
        self.licenseLifetime       = coder.decodeObject(of: NSNumber.self, forKey: "licenseLifetime") as? Bool
        self.applicationKeyOwner   = coder.decodeObject(of: NSString.self, forKey: "applicationKeyOwner") as String?
        self.licenseComputersCount = coder.decodeObject(of: NSNumber.self, forKey: "licenseComputersCount") as? Int
        self.licensePrice          = coder.decodeObject(of: NSString.self, forKey: "licensePrice") as String?
        self.discountText          = coder.decodeObject(of: NSString.self, forKey: "discountText") as String?
        self.buyUrl                = coder.decodeObject(of: NSString.self, forKey: "buyUrl") as String?
        self.subscriptionStatus    = coder.decodeObject(of: SubscriptionStatusDetail.self, forKey: "subscriptionStatus")

        if let applicationKeyStatusRaw = coder
            .decodeObject(of: NSString.self, forKey: "applicationKeyStatus") as String? {
            self.applicationKeyStatus = ApplicationKeyStatus(rawValue: applicationKeyStatusRaw)
        }
        if let licenseTypeRaw = coder.decodeObject(of: NSString.self, forKey: "licenseType") as String? {
            self.licenseType = LicenseType(rawValue: licenseTypeRaw)
        }
        self.licenseMaxComputersCount = coder.decodeObject(
            of: NSNumber.self,
            forKey: "licenseMaxComputersCount"
        ) as? Int
    }

    func encode(with coder: NSCoder) {
        // swiftlint:disable comma
        coder.encode(licenseStatus.rawValue,         forKey: "licenseStatus")
        coder.encode(expirationDate,                 forKey: "expirationDate")
        coder.encode(daysToExpire,                   forKey: "daysToExpire")
        coder.encode(applicationKey,                 forKey: "applicationKey")
        coder.encode(applicationKeyStatus?.rawValue, forKey: "applicationKeyStatus")
        coder.encode(applicationKeyOwner,            forKey: "applicationKeyOwner")
        coder.encode(licenseType?.rawValue,          forKey: "licenseType")
        coder.encode(licenseTrial,                   forKey: "licenseTrial")
        coder.encode(licenseLifetime,                forKey: "licenseLifetime")
        coder.encode(licenseMaxComputersCount,       forKey: "licenseMaxComputersCount")
        coder.encode(licenseComputersCount,          forKey: "licenseComputersCount")
        coder.encode(licensePrice,                   forKey: "licensePrice")
        coder.encode(discountText,                   forKey: "discountText")
        coder.encode(buyUrl,                         forKey: "buyUrl")
        coder.encode(subscriptionStatus,             forKey: "subscriptionStatus")
        // swiftlint:enable comma
    }
}

extension AppStatusInfo {
    override var description: String {
        """
        LicenseStatus = \(self.licenseStatus)
        ExpirationDate = \(self.expirationDate?.description ?? "unavailable")
        DaysToExpire = \(self.daysToExpire)
        ApplicationKey = \(self.applicationKey ?? "none")
        ApplicationKeyStatus = \(String(describing: self.applicationKeyStatus))
        ApplicationKeyOwner = \(self.applicationKeyOwner ?? "unavailable")
        LicenseType = \(String(describing: self.licenseType))
        LicenseTrial = \(self.licenseTrial?.description ?? "unavailable")
        LicenseLifetime = \(self.licenseLifetime?.description ?? "unavailable")
        LicenseMaxComputersCount = \(self.licenseMaxComputersCount?.description ?? "unavailable")
        LicenseComputersCount = \(self.licenseComputersCount?.description ?? "unavailable")
        LicensePrice = \(self.licensePrice ?? "unavailable")
        DiscountText = \(self.discountText ?? "unavailable")
        BuyUrl = \(self.buyUrl ?? "unavailable")
        SubscriptionStatus = \(String(describing: self.subscriptionStatus))
        """
    }
}

extension AppStatusInfo? {
    var description: String {
        switch self {
        case .some(let info):
            "\(info)"
        case .none:
            "nil"
        }
    }
}

extension AppStatusInfo {
    var isPaid: Bool {
        self.licenseStatus == .active || self.licenseStatus == .trial
    }

    var isAppStoreSubscription: Bool {
        self.subscriptionStatus?.inAppPaymentSystem == .appleAppStore
    }
}
