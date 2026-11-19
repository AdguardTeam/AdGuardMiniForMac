// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  OneShotReplyTests.swift
//  AdguardMiniTests
//

import XCTest
import Foundation
import AML

// MARK: - DeliveryRecorder

/// Records the arguments a guarded reply delivers. `@unchecked Sendable` because the lock guards them.
private final class DeliveryRecorder<Value>: @unchecked Sendable {
    private let lock = UnfairLock()
    private var deliveries: [Value] = []

    var count: Int {
        locked(self.lock) { self.deliveries.count }
    }

    var first: Value? {
        locked(self.lock) { self.deliveries.first }
    }

    func record(_ value: Value) {
        locked(self.lock) { self.deliveries.append(value) }
    }
}

/// Error of the first call, checked in the recorded delivery.
private struct FirstCallError: Error {}

/// Error of a call that a guarded reply must ignore.
private struct IgnoredCallError: Error {}

/// Arguments of the three-parameter reply shape.
private struct ThreeArgumentDelivery {
    let hasAttention: Bool
    let isUpsellAvailable: Bool
    let error: Error?
}

// MARK: - Tests

/// Checks that `OneShotReply.make` accepts only the first call of a reply.
final class OneShotReplyTests: XCTestCase {
    func testFirstCallForwardsArgumentsAndSecondCallIsIgnored() throws {
        let recorder = DeliveryRecorder<(text: String?, error: Error?)>()
        let rawReply: @Sendable (String?, Error?) -> Void = { text, error in
            recorder.record((text, error))
        }
        let reply = OneShotReply.make(rawReply)

        reply("report", FirstCallError())
        reply(nil, IgnoredCallError())

        XCTAssertEqual(recorder.count, 1)
        let first = try XCTUnwrap(recorder.first)
        XCTAssertEqual(first.text, "report")
        XCTAssertTrue(first.error is FirstCallError)
    }

    func testThreeArgumentReplyIsGuardedToFirstCall() throws {
        let recorder = DeliveryRecorder<ThreeArgumentDelivery>()
        let rawReply: @Sendable (Bool, Bool, Error?) -> Void = { hasAttention, isUpsellAvailable, error in
            let delivery = ThreeArgumentDelivery(
                hasAttention: hasAttention,
                isUpsellAvailable: isUpsellAvailable,
                error: error
            )
            recorder.record(delivery)
        }
        let reply = OneShotReply.make(rawReply)

        reply(true, false, nil)
        reply(false, true, IgnoredCallError())

        XCTAssertEqual(recorder.count, 1)
        let first = try XCTUnwrap(recorder.first)
        XCTAssertTrue(first.hasAttention)
        XCTAssertFalse(first.isUpsellAvailable)
        XCTAssertNil(first.error)
    }

    func testConcurrentFirstCallsDeliverExactlyOnce() {
        let recorder = DeliveryRecorder<Int>()
        let rawReply: @Sendable (Int) -> Void = { value in
            recorder.record(value)
        }
        let reply = OneShotReply.make(rawReply)

        DispatchQueue.concurrentPerform(iterations: 16) { index in
            reply(index)
        }

        XCTAssertEqual(recorder.count, 1)
    }
}
