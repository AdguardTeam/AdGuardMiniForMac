// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStoreProductInfo+Utils.swift
//  AdguardMini
//

import Foundation
import StoreKit

import SciterSchema

extension AppStoreProductInfo {
    func toProto(introOfferTitle: String? = nil, introOfferSubtitle: String? = nil) -> AppStoreSubscriptionInfo {
        var introOfferDisplayPrice: String?
        if let offer = self.introductoryOffer, offer.paymentMode != .freeTrial {
            introOfferDisplayPrice = offer.displayPrice
        }

        return AppStoreSubscriptionInfo(
            displayPrice: self.displayPrice,
            introOfferDisplayPrice: introOfferDisplayPrice
        )
    }
}
