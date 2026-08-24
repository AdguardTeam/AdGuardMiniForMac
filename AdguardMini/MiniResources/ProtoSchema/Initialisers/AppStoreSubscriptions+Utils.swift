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

// MARK: - AppStoreSubscriptions init

extension AppStoreSubscriptionInfo {
    public init(
        displayPrice: String = "",
        introOfferDisplayPrice: String? = nil
    ) {
        self.init()
        self.displayPrice = displayPrice
        if let introOfferDisplayPrice {
            self.introOfferDisplayPrice = introOfferDisplayPrice
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
