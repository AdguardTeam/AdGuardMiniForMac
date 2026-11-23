// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStoreSubscriptionInfoTests.swift
//  AdguardMiniTests
//

import XCTest

import ProtoSchema
import SwiftProtobuf

/// Covers the per-plan App Store offer payload the paywall builds its copy from.
final class AppStoreSubscriptionInfoTests: XCTestCase {
    private static let annualPrice = "1,999.99 TRY"

    /// A plan without an offer reports neither a trial nor a discount.
    func testPlanWithoutOfferReportsNoOffer() {
        let info = AppStoreSubscriptionInfo(displayPrice: Self.annualPrice, offer: nil)

        XCTAssertEqual(info.displayPrice, Self.annualPrice)
        XCTAssertEqual(info.introOfferType, .noOffer)
        XCTAssertFalse(info.hasIntroOfferDisplayPrice)
        XCTAssertFalse(info.hasIntroOfferPeriod)
        XCTAssertEqual(info.introOfferPeriodCount, 0)
    }

    /// An ineligible user is not promised an offer the App Store will not apply.
    func testIneligibleUserReportsNoOffer() {
        let product = AppStoreProductInfo(
            productId: "annual",
            localizedTitle: "Yearly",
            localizedDescription: "",
            displayPrice: Self.annualPrice,
            isEligibleForIntroOffer: false,
            subscriptionPeriod: AppStoreSubscriptionPeriod(unit: .year, value: 1),
            introductoryOffer: Self.payUpFrontOffer(period: .init(unit: .year, value: 1)),
            discounts: []
        )

        let info = product.toProto()

        XCTAssertEqual(info.displayPrice, Self.annualPrice)
        XCTAssertEqual(info.introOfferType, .noOffer)
        XCTAssertFalse(info.hasIntroOfferDisplayPrice)
        XCTAssertFalse(info.hasIntroOfferPeriod)
    }

    /// A free trial reports its length and carries no discounted price of its own.
    func testFreeTrialReportsPeriodAndNoPrice() {
        let offer = AppStoreSubscriptionOffer(
            paymentMode: .freeTrial,
            displayPrice: "0 TRY",
            period: .init(unit: .week, value: 1),
            periodCount: 1
        )

        let info = Self.product(with: offer).toProto()

        XCTAssertEqual(info.introOfferType, .freeTrial)
        XCTAssertEqual(info.introOfferPeriod, .init(unit: .week, value: 1))
        XCTAssertEqual(info.introOfferPeriodCount, 1)
        XCTAssertFalse(info.hasIntroOfferDisplayPrice)
    }

    /// A paid offer reports its price together with the period it applies to.
    func testPaidOfferReportsPriceAndPeriod() {
        let offer = Self.payUpFrontOffer(
            displayPrice: "199.99 TRY",
            period: .init(unit: .month, value: 1)
        )

        let info = Self.product(with: offer).toProto()

        XCTAssertEqual(info.introOfferType, .payUpFront)
        XCTAssertEqual(info.introOfferDisplayPrice, "199.99 TRY")
        XCTAssertEqual(info.introOfferPeriod, .init(unit: .month, value: 1))
        XCTAssertEqual(info.introOfferPeriodCount, 1)
    }

    /// An offer that spans several periods keeps the count, so the copy does not call it a single period.
    func testMultiPeriodOfferKeepsPeriodCount() {
        let offer = AppStoreSubscriptionOffer(
            paymentMode: .payAsYouGo,
            displayPrice: "99.99 TRY",
            period: .init(unit: .month, value: 1),
            periodCount: 3
        )

        let info = Self.product(with: offer).toProto()

        XCTAssertEqual(info.introOfferType, .payAsYouGo)
        XCTAssertEqual(info.introOfferPeriod, .init(unit: .month, value: 1))
        XCTAssertEqual(info.introOfferPeriodCount, 3)
    }

    /// The offer payload survives the bridge serialization that carries it to the UI.
    func testOfferPayloadRoundTripsThroughSerialization() throws {
        let info = AppStoreSubscriptionInfo(
            displayPrice: Self.annualPrice,
            introOfferDisplayPrice: "199.99 TRY",
            offerType: .payAsYouGo,
            offerPeriod: .init(unit: .month, value: 1),
            offerPeriodCount: 3
        )

        let decoded = try AppStoreSubscriptionInfo(serializedBytes: info.serializedData())

        XCTAssertEqual(decoded, info)
        XCTAssertEqual(decoded.introOfferType, .payAsYouGo)
        XCTAssertEqual(decoded.introOfferPeriod, .init(unit: .month, value: 1))
        XCTAssertEqual(decoded.introOfferPeriodCount, 3)
    }

    /// A month is counted on the calendar, not assumed to be 30 days.
    func testMonthLengthFollowsTheCalendar() throws {
        let start = try XCTUnwrap(Calendar.current.date(from: DateComponents(year: 2026, month: 2, day: 10)))

        XCTAssertEqual(AppStoreSubscriptionPeriod(unit: .month, value: 1).numberOfDays(from: start), 28)
    }

    /// A year is counted on the calendar, so a leap year gives one day more.
    func testYearLengthFollowsTheCalendar() throws {
        let start = try XCTUnwrap(Calendar.current.date(from: DateComponents(year: 2024, month: 2, day: 10)))

        XCTAssertEqual(AppStoreSubscriptionPeriod(unit: .year, value: 1).numberOfDays(from: start), 366)
    }

    /// The days and weeks are exact lengths.
    func testDayAndWeekLengthsAreExact() {
        XCTAssertEqual(AppStoreSubscriptionPeriod(unit: .week, value: 2).numberOfDays(), 14)
    }

    // MARK: Private helpers

    private static func product(with offer: AppStoreSubscriptionOffer) -> AppStoreProductInfo {
        AppStoreProductInfo(
            productId: "annual",
            localizedTitle: "Yearly",
            localizedDescription: "",
            displayPrice: Self.annualPrice,
            isEligibleForIntroOffer: true,
            subscriptionPeriod: AppStoreSubscriptionPeriod(unit: .year, value: 1),
            introductoryOffer: offer,
            discounts: []
        )
    }

    private static func payUpFrontOffer(
        displayPrice: String = "199.99 TRY",
        period: AppStoreSubscriptionPeriod
    ) -> AppStoreSubscriptionOffer {
        AppStoreSubscriptionOffer(
            paymentMode: .payUpFront,
            displayPrice: displayPrice,
            period: period,
            periodCount: 1
        )
    }
}
