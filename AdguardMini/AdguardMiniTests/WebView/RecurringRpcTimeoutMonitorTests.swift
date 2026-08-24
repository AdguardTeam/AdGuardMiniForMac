// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  RecurringRpcTimeoutMonitorTests.swift
//  AdguardMiniTests
//

import XCTest

/// State-machine tests for `RecurringRpcTimeoutMonitor`.
final class RecurringRpcTimeoutMonitorTests: XCTestCase {
    private func makeMonitor() -> RecurringRpcTimeoutMonitor {
        // Uses production default threshold (3).
        RecurringRpcTimeoutMonitor()
    }

    func testRecordTimeout_3ConsecutiveTimeouts_ReturnsTrueOnThirdOnly() {
        let monitor = makeMonitor()
        XCTAssertFalse(monitor.recordTimeout(), "1st timeout must not surface")
        XCTAssertFalse(monitor.recordTimeout(), "2nd timeout must not surface")
        XCTAssertTrue(monitor.recordTimeout(), "3rd timeout MUST surface alert")
        XCTAssertFalse(monitor.recordTimeout(), "4th timeout must not re-surface in same cycle")
    }

    func testRecordTimeout_2ConsecutiveTimeouts_DoNotSurface() {
        let monitor = makeMonitor()
        XCTAssertFalse(monitor.recordTimeout())
        XCTAssertFalse(monitor.recordTimeout())
    }

    func testRecordSuccess_ResetsCounter_AllowsNextRunToSurfaceOn3() {
        let monitor = makeMonitor()
        XCTAssertFalse(monitor.recordTimeout())
        XCTAssertFalse(monitor.recordTimeout())
        monitor.recordSuccess()
        XCTAssertFalse(monitor.recordTimeout(), "after reset: 1st timeout must not surface")
        XCTAssertFalse(monitor.recordTimeout(), "after reset: 2nd timeout must not surface")
        XCTAssertTrue(monitor.recordTimeout(), "after reset: 3rd timeout MUST surface")
    }

    func testRecordSuccess_OnFreshMonitor_IsNoOp() {
        let monitor = makeMonitor()
        monitor.recordSuccess()
        XCTAssertFalse(monitor.recordTimeout(), "fresh-monitor success is a no-op")
    }
}
