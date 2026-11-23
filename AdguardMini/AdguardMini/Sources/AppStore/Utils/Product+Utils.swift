// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SKProduct+Utils.swift
//  AdguardMini
//

import StoreKit

extension Product {
    func toAppStoreProductInfo() async -> AppStoreProductInfo {
        let subscription = self.subscription
        return AppStoreProductInfo(
            productId: self.id,
            localizedTitle: self.displayName,
            localizedDescription: self.description,
            displayPrice: self.displayPrice,
            isEligibleForIntroOffer: await subscription?.isEligibleForIntroOffer ?? false,
            subscriptionPeriod: subscription?.subscriptionPeriod.toAppStorePeriod,
            introductoryOffer: subscription?.introductoryOffer?.toAppStoreOffer,
            discounts: (subscription?.promotionalOffers ?? []).compactMap(\.toAppStoreOffer)
        )
    }
}

private extension Product.SubscriptionPeriod {
    /// The period in the app's own terms, or `nil` for a unit the paywall cannot describe.
    var toAppStorePeriod: AppStoreSubscriptionPeriod? {
        let unit: AppStoreSubscriptionPeriod.Unit
        switch self.unit {
        case .day: unit = .day
        case .week: unit = .week
        case .month: unit = .month
        case .year: unit = .year
        @unknown default: return nil
        }

        return AppStoreSubscriptionPeriod(unit: unit, value: self.value)
    }
}

private extension Product.SubscriptionOffer {
    /// The offer in the app's own terms, or `nil` for offer facts the paywall cannot describe.
    var toAppStoreOffer: AppStoreSubscriptionOffer? {
        guard let period = self.period.toAppStorePeriod else {
            return nil
        }

        let paymentMode: AppStoreSubscriptionOffer.PaymentMode
        switch self.paymentMode {
        case .freeTrial: paymentMode = .freeTrial
        case .payAsYouGo: paymentMode = .payAsYouGo
        case .payUpFront: paymentMode = .payUpFront
        default: return nil
        }

        return AppStoreSubscriptionOffer(
            paymentMode: paymentMode,
            displayPrice: self.displayPrice,
            period: period,
            periodCount: self.periodCount
        )
    }
}
