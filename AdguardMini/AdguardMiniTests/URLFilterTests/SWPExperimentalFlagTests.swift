// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SWPExperimentalFlagTests.swift
//  AdguardMiniTests
//

import XCTest

/// Verifies the channel-aware resolution of the System-wide Protection
/// experimental flag.
final class SWPExperimentalFlagTests: XCTestCase {
    func testStoredTrueWinsOverReleaseDefault() {
        self.assertFlag(stored: true, installed: false, intent: false, expected: true)
    }

    func testStoredFalseWinsOverInstalledFilter() {
        self.assertFlag(stored: false, installed: true, intent: true, expected: false)
    }

    func testUnsetFlagOnReleaseFollowsFilterInstallation() {
        self.assertFlag(stored: nil, installed: true, intent: false, expected: true)
        self.assertFlag(stored: nil, installed: false, intent: false, expected: false)
    }

    func testUnsetFlagOnReleaseFollowsUserIntent() {
        self.assertFlag(stored: nil, installed: false, intent: true, expected: true)
    }

    func testUnsetFlagOnBetaIsEnabled() {
        self.assertFlag(stored: nil, channel: "beta", installed: false, intent: false, expected: true)
    }

    func testUnsetFlagOnNightlyIsEnabled() {
        self.assertFlag(stored: nil, channel: "nightly", installed: false, intent: false, expected: true)
    }

    func testUnsetFlagOnUnknownChannelFallsBackToReleaseBehavior() {
        self.assertFlag(stored: nil, channel: "unknown", installed: false, intent: false, expected: false)
        self.assertFlag(stored: nil, channel: "", installed: false, intent: false, expected: false)
        self.assertFlag(stored: nil, channel: "unknown", installed: true, intent: false, expected: true)
        self.assertFlag(stored: nil, channel: "unknown", installed: false, intent: true, expected: true)
    }

    // The helper mirrors the resolver's unset-vs-false distinction.
    // swiftlint:disable discouraged_optional_boolean
    private func assertFlag(
        stored: Bool?,
        channel: String = "release",
        installed: Bool,
        intent: Bool,
        expected: Bool,
        line: UInt = #line
    ) {
        XCTAssertEqual(
            SWPExperimentalFlag.isEnabled(
                storedValue: stored,
                channel: channel,
                isFilterInstalled: installed,
                userIntent: intent
            ),
            expected,
            line: line
        )
    }
    // swiftlint:enable discouraged_optional_boolean
}

/// Verifies the persisted flag store: the explicit choice, the reset, and the
/// install-state refresh.
final class SWPExperimentalFlagStoreTests: XCTestCase {
    private var suiteName: String!
    private var userDefaults: UserDefaults!
    private var installedState: FakeInstalledState!
    private var userIntent = false

    override func setUp() {
        super.setUp()
        self.suiteName = "SWPExperimentalFlagStoreTests.\(UUID().uuidString)"
        self.userDefaults = UserDefaults(suiteName: self.suiteName)
        self.installedState = FakeInstalledState()
        self.userIntent = false
    }

    override func tearDown() {
        self.userDefaults.removePersistentDomain(forName: self.suiteName)
        self.userDefaults = nil
        self.installedState = nil
        self.suiteName = nil
        super.tearDown()
    }

    func testReleaseDefaultsFollowInstallationAndIntent() {
        XCTAssertFalse(self.makeStore(channel: "release").isEnabled)
        self.installedState.isFilterInstalled = true
        XCTAssertTrue(self.makeStore(channel: "release").isEnabled)
        self.installedState.isFilterInstalled = false
        self.userIntent = true
        XCTAssertTrue(self.makeStore(channel: "release").isEnabled)
    }

    func testBetaAndNightlyDefaultToEnabled() {
        XCTAssertTrue(self.makeStore(channel: "beta").isEnabled)
        XCTAssertTrue(self.makeStore(channel: "nightly").isEnabled)
    }

    func testStoredValueOverridesTheDefault() {
        let betaStore = self.makeStore(channel: "beta")
        betaStore.setStoredValue(false)
        XCTAssertFalse(betaStore.isEnabled)

        let releaseStore = self.makeStore(channel: "release")
        releaseStore.setStoredValue(true)
        XCTAssertTrue(releaseStore.isEnabled)

        self.installedState.isFilterInstalled = true
        releaseStore.setStoredValue(false)
        XCTAssertFalse(releaseStore.isEnabled)
    }

    func testResetRemovesTheStoredChoice() {
        let store = self.makeStore(channel: "beta")
        store.setStoredValue(false)
        XCTAssertFalse(store.isEnabled)

        store.reset()

        XCTAssertNil(store.storedValue)
        XCTAssertTrue(store.isEnabled)
    }

    func testSetterPersistsTheValue() {
        let store = self.makeStore(channel: "release")
        store.setStoredValue(true)
        XCTAssertTrue(store.isEnabled)

        store.setStoredValue(false)
        XCTAssertFalse(store.isEnabled)
        XCTAssertFalse(store.storedValue ?? true)
    }

    func testRefreshIsReflected() async {
        let store = self.makeStore(channel: "release")
        XCTAssertFalse(store.isEnabled)

        await self.installedState.refreshInstalledState()
        self.installedState.isFilterInstalled = true

        XCTAssertEqual(self.installedState.refreshCalls, 1)
        XCTAssertTrue(store.isEnabled)
    }

    private func makeStore(channel: String) -> SWPExperimentalFlagStore {
        SWPExperimentalFlagStore(
            userDefaults: self.userDefaults,
            installedState: self.installedState,
            channel: channel
        ) { [weak self] in
            self?.userIntent ?? false
        }
    }
}

private final class FakeInstalledState: URLFilterInstalledStateProvider {
    var isFilterInstalled = false
    var refreshCalls = 0

    func refreshInstalledState() async {
        self.refreshCalls += 1
    }
}
