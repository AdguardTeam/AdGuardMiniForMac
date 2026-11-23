// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStoreProductInfo.swift
//  AdguardMini
//

import Foundation

/// A subscription billing period, as the App Store reports it.
struct AppStoreSubscriptionPeriod: Equatable {
    /// The length unit of a subscription period.
    enum Unit: Equatable {
        case day
        case week
        case month
        case year
    }

    let unit: Unit
    let value: Int
}

extension AppStoreSubscriptionPeriod {
    /// The period length in whole days counted from `date`.
    ///
    /// A month or a year is not a fixed number of days, so the length is counted
    /// on the calendar instead of assuming 30 or 365 days.
    ///
    /// - Parameter date - The date the period starts on
    func numberOfDays(from date: Date = Date()) -> Int {
        let calendar = Calendar(identifier: .gregorian)
        let start = calendar.startOfDay(for: date)
        guard let end = calendar.date(byAdding: self.dateComponents, to: start) else {
            return 0
        }

        return calendar.dateComponents([.day], from: start, to: end).day ?? 0
    }

    /// The calendar components the period length stands for.
    private var dateComponents: DateComponents {
        switch self.unit {
        case .day: DateComponents(day: self.value)
        case .week: DateComponents(day: self.value * 7)
        case .month: DateComponents(month: self.value)
        case .year: DateComponents(year: self.value)
        }
    }
}

/// A discounted subscription offer, as the App Store reports it.
struct AppStoreSubscriptionOffer: Equatable {
    /// How the App Store charges the periods of an offer.
    enum PaymentMode: Equatable {
        /// The offer gives free service for its whole length.
        case freeTrial
        /// The offer repeats its price for every period it covers.
        case payAsYouGo
        /// The offer charges its price once for all the periods it covers.
        case payUpFront
    }

    let paymentMode: PaymentMode
    let displayPrice: String
    let period: AppStoreSubscriptionPeriod
    let periodCount: Int
}

/// The facts about one App Store subscription the paywall reports on.
struct AppStoreProductInfo {
    let productId: String

    let localizedTitle: String
    let localizedDescription: String

    let displayPrice: String

    let isEligibleForIntroOffer: Bool
    let subscriptionPeriod: AppStoreSubscriptionPeriod?
    let introductoryOffer: AppStoreSubscriptionOffer?
    let discounts: [AppStoreSubscriptionOffer]
}
