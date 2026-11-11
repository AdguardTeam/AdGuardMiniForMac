// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailFiltersUpdaterTests.swift
//  AdguardMiniTests
//

import ContentBlockerConverter
import XCTest

/// Verifies a Mail protection toggle-off clears the ruleset and reloads the
/// extension even while the updater is stopped with the main protection off.
final class MailFiltersUpdaterTests: XCTestCase {
    /// Records every ruleset the updater persists.
    private final class RecordingStorage: MailRulesetStorage, @unchecked Sendable {
        private(set) var savedData: [Data] = []

        func save(_ data: Data) async -> Bool {
            self.savedData.append(data)
            return true
        }
    }

    /// Counts reloads and signals the one the test waits for.
    private actor FakeReloader: MailExtensionReloader {
        private(set) var callCount = 0
        private let reloaded: XCTestExpectation

        init(reloaded: XCTestExpectation) {
            self.reloaded = reloaded
        }

        func reload() async -> Bool {
            self.callCount += 1
            self.reloaded.fulfill()
            return true
        }
    }

    private final class FakeRuleProvider: MailRuleProvider, @unchecked Sendable {
        func mailFilterRules() async -> [String] { [] }
        func enabledUserRules() async -> [String] { [] }
    }

    private struct FakePremiumProvider: MailPremiumStatusProvider {
        func isPremiumActive() async -> Bool { false }
    }

    private struct FakeProtectionProvider: MailProtectionStatusProvider {
        let mailProtection: Bool
    }

    private final class FakeExtensionStateService: MailExtensionStateService, @unchecked Sendable {
        func getState() async -> MailExtension.State { .empty }

        @discardableResult
        func updateState(_ newState: MailExtension.State) async -> Bool { true }

        func setLoading(_ loading: Bool) async {}
    }

    func testDisabledMailProtectionClearsRulesetWhileUpdaterIsStopped() async {
        let reloaded = self.expectation(description: "The Mail extension is reloaded")
        let storage = RecordingStorage()
        let reloader = FakeReloader(reloaded: reloaded)
        let updater = MailFiltersUpdaterImpl(
            converter: MailRulesetConverter(
                converter: FiltersConverterImpl(converter: ContentBlockerConverter()),
                storage: storage
            ),
            ruleProvider: FakeRuleProvider(),
            licenseProvider: FakePremiumProvider(),
            reloader: reloader,
            protectionProvider: FakeProtectionProvider(mailProtection: false),
            extensionStateService: FakeExtensionStateService()
        )

        // The updater is stopped here, as it is while the main protection is off.
        updater.updateMailFilters()

        await self.fulfillment(of: [reloaded], timeout: 5)

        XCTAssertEqual(storage.savedData, [Data("[]".utf8)])
        let callCount = await reloader.callCount
        XCTAssertEqual(callCount, 1)
    }
}
