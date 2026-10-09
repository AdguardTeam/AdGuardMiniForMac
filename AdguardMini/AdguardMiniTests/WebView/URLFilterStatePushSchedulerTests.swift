// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStatePushSchedulerTests.swift
//  AdguardMiniTests
//

import XCTest

// MARK: - Recorder

/// Lock-guarded assembly counter and delivery sink for scheduler closures.
private final class Recorder: @unchecked Sendable {
    private let lock = NSLock()
    private var assemblyCount = 0
    private var deliveredStates: [URLFilterUIState] = []

    /// The next 1-based assembly index.
    func nextAssembly() -> Int {
        self.lock.lock()
        defer { self.lock.unlock() }
        self.assemblyCount += 1
        return self.assemblyCount
    }

    /// States passed to the deliver closure, in delivery order.
    var delivered: [URLFilterUIState] {
        self.lock.lock()
        defer { self.lock.unlock() }
        return self.deliveredStates
    }

    func recordDelivery(_ state: URLFilterUIState) {
        self.lock.lock()
        defer { self.lock.unlock() }
        self.deliveredStates.append(state)
    }
}

// MARK: - URLFilterStatePushSchedulerTests

final class URLFilterStatePushSchedulerTests: XCTestCase {
    func testSingleScheduleDeliversTheAssembledState() async throws {
        let recorder = Recorder()
        let scheduler = URLFilterStatePushScheduler(
            debounceSeconds: 0,
            assemble: { Self.state(status: .error) },
            deliver: { recorder.recordDelivery($0) }
        )

        scheduler.schedule()

        try await self.waitUntil { recorder.delivered == [Self.state(status: .error)] }
    }

    /// The crash-loop regression: events arriving faster than the debounce must
    /// still deliver, not drop every push.
    func testBurstOfEventsStillDelivers() async throws {
        let recorder = Recorder()
        let newest = Self.state(status: .running)
        let scheduler = URLFilterStatePushScheduler(
            debounceSeconds: 0,
            assemble: { newest },
            deliver: { recorder.recordDelivery($0) }
        )

        for _ in 0..<5 {
            scheduler.schedule()
        }

        try await self.waitUntil { !recorder.delivered.isEmpty }
        XCTAssertEqual(recorder.delivered.last, newest)
    }

    /// A superseded assembly completing after a newer delivery must not
    /// overwrite the newer state.
    func testSupersededAssemblyDoesNotOverwriteANewerState() async throws {
        let recorder = Recorder()
        let firstStarted = AsyncSignal()
        let releaseFirst = AsyncSignal()
        let newest = Self.state(status: .running)
        let scheduler = URLFilterStatePushScheduler(
            debounceSeconds: 0,
            assemble: {
                guard recorder.nextAssembly() > 1 else {
                    firstStarted.signal()
                    await releaseFirst.wait()
                    return Self.state(status: .error)
                }
                return newest
            },
            deliver: { recorder.recordDelivery($0) }
        )

        scheduler.schedule()
        await firstStarted.wait()
        scheduler.schedule()
        try await self.waitUntil { recorder.delivered.contains(newest) }

        releaseFirst.signal()
        try await Task.sleep(seconds: 0.1)

        XCTAssertEqual(recorder.delivered.last, newest)
        XCTAssertFalse(recorder.delivered.contains(Self.state(status: .error)))
    }

    /// The starvation regression: an assembly that completes while a newer one
    /// is still running must still be delivered.
    func testCompletedAssemblyDeliversWhileANewerOneRuns() async throws {
        let recorder = Recorder()
        let firstStarted = AsyncSignal()
        let releaseFirst = AsyncSignal()
        let secondStarted = AsyncSignal()
        let releaseSecond = AsyncSignal()
        let scheduler = URLFilterStatePushScheduler(
            debounceSeconds: 0,
            assemble: {
                guard recorder.nextAssembly() > 1 else {
                    firstStarted.signal()
                    await releaseFirst.wait()
                    return Self.state(status: .error)
                }
                secondStarted.signal()
                await releaseSecond.wait()
                return Self.state(status: .running)
            },
            deliver: { recorder.recordDelivery($0) }
        )

        scheduler.schedule()
        await firstStarted.wait()
        scheduler.schedule()
        await secondStarted.wait()

        releaseFirst.signal()
        try await self.waitUntil { !recorder.delivered.isEmpty }
        XCTAssertEqual(recorder.delivered, [Self.state(status: .error)])

        releaseSecond.signal()
        try await self.waitUntil { recorder.delivered.count == 2 }
        XCTAssertEqual(recorder.delivered.last, Self.state(status: .running))
    }

    /// A delivery must finish before a newer one starts, so the callbacks reach
    /// the bridge in sequence order even when both assemblies complete together.
    func testNewerDeliveryWaitsForTheInFlightOne() async throws {
        let recorder = Recorder()
        let firstAssembled = AsyncSignal()
        let secondAssembled = AsyncSignal()
        let releaseFirstAssembly = AsyncSignal()
        let releaseSecondAssembly = AsyncSignal()
        let firstDeliveryStarted = AsyncSignal()
        let releaseFirstDelivery = DispatchSemaphore(value: 0)
        let scheduler = URLFilterStatePushScheduler(
            debounceSeconds: 0,
            assemble: {
                guard recorder.nextAssembly() > 1 else {
                    firstAssembled.signal()
                    await releaseFirstAssembly.wait()
                    return Self.state(status: .error)
                }
                secondAssembled.signal()
                await releaseSecondAssembly.wait()
                return Self.state(status: .running)
            },
            deliver: { state in
                if state.status == .error {
                    firstDeliveryStarted.signal()
                    // Bounded so a failing assertion cannot block the thread forever.
                    _ = releaseFirstDelivery.wait(timeout: .now() + 5)
                }
                recorder.recordDelivery(state)
            }
        )

        scheduler.schedule()
        await firstAssembled.wait()
        scheduler.schedule()
        await secondAssembled.wait()

        releaseFirstAssembly.signal()
        await firstDeliveryStarted.wait()
        releaseSecondAssembly.signal()
        try await Task.sleep(seconds: 0.05)

        XCTAssertTrue(recorder.delivered.isEmpty, "A newer delivery must wait for the in-flight one")

        releaseFirstDelivery.signal()
        try await self.waitUntil { recorder.delivered.count == 2 }
        XCTAssertEqual(
            recorder.delivered,
            [Self.state(status: .error), Self.state(status: .running)]
        )
    }

    // MARK: Helpers

    private static func state(status: URLFilterUIStatus) -> URLFilterUIState {
        URLFilterUIState(
            enabled: status == .running,
            status: status,
            protectionLevel: .essential,
            isInstalled: true,
            info: .empty
        )
    }

    /// Polls `condition` until it holds or `timeout` elapses.
    private func waitUntil(
        timeout: TimeInterval = 2,
        _ condition: () -> Bool
    ) async throws {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition(), Date() < deadline {
            try await Task.sleep(seconds: 0.01)
        }
        XCTAssertTrue(condition(), "Condition was not met within \(timeout)s")
    }
}
