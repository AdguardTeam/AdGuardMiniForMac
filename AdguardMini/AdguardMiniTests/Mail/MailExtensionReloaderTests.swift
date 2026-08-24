// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailExtensionReloaderTests.swift
//  AdguardMiniTests
//

import XCTest

/// Verifies the MailKit reloader is untouched by the Safari retry feature:
/// `reload()` makes exactly one MailKit call and never retries, on both the
/// success and the failure path.
final class MailExtensionReloaderTests: XCTestCase {
    /// Controllable stand-in for `MEExtensionManager.reloadContentBlocker`.
    private actor FakeMailReload {
        private(set) var callCount = 0
        private let fails: Bool

        init(fails: Bool) {
            self.fails = fails
        }

        func reload() throws {
            self.callCount += 1
            if self.fails {
                throw Self.Failure()
            }
        }

        private struct Failure: Error {}
    }

    func testFailingReloadMakesExactlyOneCallAndReturnsFalse() async {
        let fake = FakeMailReload(fails: true)
        let reloader = MailExtensionReloaderImpl { try await fake.reload() }

        let result = await reloader.reload()

        XCTAssertFalse(result)
        let calls = await fake.callCount
        XCTAssertEqual(calls, 1)
    }

    func testSucceedingReloadMakesExactlyOneCallAndReturnsTrue() async {
        let fake = FakeMailReload(fails: false)
        let reloader = MailExtensionReloaderImpl { try await fake.reload() }

        let result = await reloader.reload()

        XCTAssertTrue(result)
        let calls = await fake.callCount
        XCTAssertEqual(calls, 1)
    }
}
