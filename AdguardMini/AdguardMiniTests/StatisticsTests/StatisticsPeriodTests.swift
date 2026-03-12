// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  StatisticsPeriodTests.swift
//  AdguardMiniTests
//

import XCTest

final class StatisticsPeriodTests: XCTestCase {
    private var calendar: Calendar!
    private var referenceDate: Date!

    override func setUp() {
        super.setUp()
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(secondsFromGMT: 0)!
        self.calendar = cal

        self.referenceDate = Date(timeIntervalSince1970: 1_710_259_200)
    }

    func testAllPeriod_ReturnsNilPredicate() {
        let predicate = StatisticsPeriod.all.datePredicate(referenceDate: self.referenceDate, calendar: self.calendar)

        XCTAssertNil(predicate)
    }

    func testDayPeriod_ReturnsPredicateWithCorrectRange() {
        let predicate = StatisticsPeriod.day.datePredicate(referenceDate: self.referenceDate, calendar: self.calendar)

        XCTAssertNotNil(predicate)

        let predicateString = predicate!.predicateFormat
        XCTAssertTrue(predicateString.contains("date >= "))
        XCTAssertTrue(predicateString.contains("date < "))
    }

    func testWeekPeriod_ReturnsPredicateWithCorrectRange() {
        let predicate = StatisticsPeriod.week.datePredicate(referenceDate: self.referenceDate, calendar: self.calendar)

        XCTAssertNotNil(predicate)

        let predicateString = predicate!.predicateFormat
        XCTAssertTrue(predicateString.contains("date >= "))
        XCTAssertTrue(predicateString.contains("date < "))
    }

    func testMonthPeriod_ReturnsPredicateWithCorrectRange() {
        let predicate = StatisticsPeriod.month.datePredicate(referenceDate: self.referenceDate, calendar: self.calendar)

        XCTAssertNotNil(predicate)

        let predicateString = predicate!.predicateFormat
        XCTAssertTrue(predicateString.contains("date >= "))
        XCTAssertTrue(predicateString.contains("date < "))
    }

    func testYearPeriod_ReturnsPredicateWithCorrectRange() {
        let predicate = StatisticsPeriod.year.datePredicate(referenceDate: self.referenceDate, calendar: self.calendar)

        XCTAssertNotNil(predicate)

        let predicateString = predicate!.predicateFormat
        XCTAssertTrue(predicateString.contains("date >= "))
        XCTAssertTrue(predicateString.contains("date < "))
    }

    func testDefaultReferenceDate_DoesNotCrash() {
        let predicate = StatisticsPeriod.day.datePredicate()

        XCTAssertNotNil(predicate)
    }

    func testDayPeriod_ExactDateRange() {
        let predicate = StatisticsPeriod.day.datePredicate(referenceDate: self.referenceDate, calendar: self.calendar)!

        let today = self.calendar.startOfDay(for: self.referenceDate)
        let tomorrow = self.calendar.date(byAdding: .day, value: 1, to: today)!

        let testDate = today
        let result = predicate.evaluate(with: ["date": testDate])
        XCTAssertTrue(result)

        let yesterdayDate = self.calendar.date(byAdding: .day, value: -1, to: today)!
        let yesterdayResult = predicate.evaluate(with: ["date": yesterdayDate])
        XCTAssertFalse(yesterdayResult)

        let tomorrowResult = predicate.evaluate(with: ["date": tomorrow])
        XCTAssertFalse(tomorrowResult)
    }

    func testWeekPeriod_ExactDateRange() {
        let predicate = StatisticsPeriod.week.datePredicate(referenceDate: self.referenceDate, calendar: self.calendar)!

        let today = self.calendar.startOfDay(for: self.referenceDate)
        let weekStart = self.calendar.date(byAdding: .day, value: -6, to: today)!
        let weekEnd = self.calendar.date(byAdding: .day, value: 1, to: today)!

        let startResult = predicate.evaluate(with: ["date": weekStart])
        XCTAssertTrue(startResult)

        let todayResult = predicate.evaluate(with: ["date": today])
        XCTAssertTrue(todayResult)

        let endResult = predicate.evaluate(with: ["date": weekEnd])
        XCTAssertFalse(endResult)

        let beforeStart = self.calendar.date(byAdding: .day, value: -7, to: today)!
        let beforeResult = predicate.evaluate(with: ["date": beforeStart])
        XCTAssertFalse(beforeResult)
    }

    func testMonthPeriod_ExactDateRange() {
        let predicate = StatisticsPeriod.month.datePredicate(
            referenceDate: self.referenceDate,
            calendar: self.calendar
        )!

        let today = self.calendar.startOfDay(for: self.referenceDate)
        let monthStart = self.calendar.date(byAdding: .day, value: -29, to: today)!
        let monthEnd = self.calendar.date(byAdding: .day, value: 1, to: today)!

        let startResult = predicate.evaluate(with: ["date": monthStart])
        XCTAssertTrue(startResult)

        let todayResult = predicate.evaluate(with: ["date": today])
        XCTAssertTrue(todayResult)

        let endResult = predicate.evaluate(with: ["date": monthEnd])
        XCTAssertFalse(endResult)

        let beforeStart = self.calendar.date(byAdding: .day, value: -30, to: today)!
        let beforeResult = predicate.evaluate(with: ["date": beforeStart])
        XCTAssertFalse(beforeResult)
    }
}
