// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStoreSubscriptions+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

// MARK: - PromoInfo init

extension PromoInfo {
    public init(
        title: String,
        subtitle: String,
        buttonText: String?,
        buttonUrl: String?
    ) {
        self.init()
        self.title = title
        self.subtitle = subtitle
        if let buttonText {
            self.buttonText = buttonText
        }
        if let buttonUrl {
            self.buttonURL = buttonUrl
        }
    }
}

// MARK: - AppStoreSubscriptionOfferPeriod init

extension AppStoreSubscriptionOfferPeriod {
    public init(unit: AppStoreSubscriptionOfferPeriodUnit, value: Int32) {
        self.init()
        self.unit = unit
        self.value = value
    }
}

// MARK: - AppStoreSubscriptionInfo init

extension AppStoreSubscriptionInfo {
    public init(
        displayPrice: String = "",
        introOfferDisplayPrice: String? = nil,
        offerType: AppStoreSubscriptionOfferType = .noOffer,
        offerPeriod: AppStoreSubscriptionOfferPeriod? = nil,
        offerPeriodCount: Int32 = 0
    ) {
        self.init()
        self.displayPrice = displayPrice
        self.introOfferType = offerType
        self.introOfferPeriodCount = offerPeriodCount
        if let introOfferDisplayPrice {
            self.introOfferDisplayPrice = introOfferDisplayPrice
        }
        if let offerPeriod {
            self.introOfferPeriod = offerPeriod
        }
    }
}

// MARK: - AppStoreSubscriptions init

extension AppStoreSubscriptions {
    public init(
        monthly: AppStoreSubscriptionInfo,
        annual: AppStoreSubscriptionInfo,
        promoInfo: PromoInfo? = nil
    ) {
        self.init()
        self.monthly = monthly
        self.annual = annual
        if let promoInfo {
            self.promoInfo = promoInfo
        }
    }
}

extension AppStoreSubscriptionsMessage {
    public init(
        result: AppStoreSubscriptions = AppStoreSubscriptions(),
        error: AppStoreSubscriptionsError = .unknown
    ) {
        self.init()
        self.result = result
        self.error = error
    }
}
