// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStoreProductInfo+Utils.swift
//  AdguardMini
//

import ProtoSchema

extension AppStoreProductInfo {
    /// Converts the product into the per-plan subscription info the UI renders.
    ///
    /// The introductory offer is reported only to a user eligible for it, so an
    /// ineligible user is never promised a trial or a discount the App Store
    /// will not apply.
    func toProto() -> AppStoreSubscriptionInfo {
        AppStoreSubscriptionInfo(
            displayPrice: self.displayPrice,
            offer: self.isEligibleForIntroOffer ? self.introductoryOffer : nil
        )
    }
}

extension AppStoreSubscriptionInfo {
    /// Builds the per-plan payload the UI copies its trial and discount from.
    ///
    /// - Parameters:
    ///   - displayPrice - Regular price of the plan
    ///   - offer - Intro offer the user is eligible for, absent when there is none
    init(displayPrice: String, offer: AppStoreSubscriptionOffer?) {
        self.init(displayPrice: displayPrice)
        guard let offer else {
            return
        }

        self.introOfferType = offer.paymentMode.toProto()
        self.introOfferPeriod = offer.period.toProto()
        self.introOfferPeriodCount = Int32(offer.periodCount)
        if offer.paymentMode != .freeTrial {
            self.introOfferDisplayPrice = offer.displayPrice
        }
    }
}

extension AppStoreSubscriptionOffer.PaymentMode {
    /// Maps the payment mode to the offer type the plan payload reports.
    func toProto() -> AppStoreSubscriptionOfferType {
        switch self {
        case .freeTrial: .freeTrial
        case .payAsYouGo: .payAsYouGo
        case .payUpFront: .payUpFront
        }
    }
}

extension AppStoreSubscriptionPeriod {
    /// Maps the period to the plan payload's offer period.
    func toProto() -> AppStoreSubscriptionOfferPeriod {
        AppStoreSubscriptionOfferPeriod(unit: self.unit.toProto(), value: Int32(self.value))
    }
}

extension AppStoreSubscriptionPeriod.Unit {
    /// Maps the unit to the offer period unit the plan payload reports.
    func toProto() -> AppStoreSubscriptionOfferPeriodUnit {
        switch self {
        case .day: .day
        case .week: .week
        case .month: .month
        case .year: .year
        }
    }
}
