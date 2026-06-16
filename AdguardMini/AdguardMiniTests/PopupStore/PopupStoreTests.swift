// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupStoreTests.swift
//  AdguardMiniTests
//

import XCTest
import AML

// MARK: - Test fixtures

private enum Constants {
    static let anyWindowToken = Store.SafariWindowToken(rawValue: 1)
    static let exampleURL = URL(string: "https://example.com")!
    /// An arbitrary non-zero timestamp used as a stub for successful effect completions.
    static let knownTimestamp: EBATimestamp = 100
}

// MARK: - MockEffectRunner

/// Records dispatched effects and optionally returns preconfigured
/// completion actions.
private final class MockEffectRunner: EffectRunning, @unchecked Sendable {
    private let lock = UnfairLock()

    private var _ranEffects: [Store.Effect] = []
    var ranEffects: [Store.Effect] {
        locked(self.lock) { self._ranEffects }
    }

    private var _cancelAllCalls = 0
    var cancelAllCalls: Int {
        locked(self.lock) { self._cancelAllCalls }
    }

    /// Preconfigured completion actions keyed by effect.
    private var _completionActions: [(Store.Effect, Store.Action)] = []

    func setCompletion(for effect: Store.Effect, action: Store.Action) {
        self._completionActions.append((effect, action))
    }

    func run(_ effect: Store.Effect) async -> Store.Action? {
        locked(self.lock) {
            self._ranEffects.append(effect)
        }
        return locked(self.lock) { self._completionActions.first { $0.0 == effect }?.1 }
    }

    func cancelAll() {
        locked(self.lock) { self._cancelAllCalls += 1 }
    }

    func registerTask(_ task: Task<Void, Never>, for effect: Store.Effect) {
        // No-op in mock — cancellation tested in EffectRunnerTests.
    }
}

// MARK: - Tests

final class PopupStoreTests: XCTestCase {
    /// Convenience constructor matching the pattern from PopupReducerTests.
    private func state(
        mainAppRunning: Bool = true,
        onboardingStatus: Store.OnboardingStatus = .completed,
        protectionEnabled: Bool = true,
        protectionEnabledForCurrentUrl: Bool = true,
        hasHealthCheckAttention: Bool = false,
        xpcAvailable: Bool = true,
        isFreeUser: Bool = true,
        isTrialAvailable: Bool = false,
        trialDays: Int = 0,
        tabStats: TabStats = TabStats(),
        tabContext: Store.TabContext = .empty,
        pausedUrls: Set<String> = [],
        inFlight: Store.InFlightAction? = nil,
        lastError: Store.Error? = nil,
        lastAppStateTimestamp: EBATimestamp = .zero
    ) -> Store.State {
        Store.State(
            mainAppRunning: mainAppRunning,
            onboardingStatus: onboardingStatus,
            protectionEnabled: protectionEnabled,
            protectionEnabledForCurrentUrl: protectionEnabledForCurrentUrl,
            hasHealthCheckAttention: hasHealthCheckAttention,
            xpcAvailable: xpcAvailable,
            isFreeUser: isFreeUser,
            isTrialAvailable: isTrialAvailable,
            trialDays: trialDays,
            tabStats: tabStats,
            tabContext: tabContext,
            pausedUrls: pausedUrls,
            inFlight: inFlight,
            lastError: lastError,
            lastAppStateTimestamp: lastAppStateTimestamp
        )
    }

    // MARK: Serialization of dispatches

    func testParallelDispatchesAreSerializedByActor() async {
        let mockRunner = MockEffectRunner()
        let store = PopupStore(
            initialState: self.state(),
            effectRunner: mockRunner
        )

        // Dispatch two actions from parallel Tasks.
        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                await store.dispatch(.themeChanged(.dark))
            }
            group.addTask {
                await store.dispatch(.themeChanged(.light))
            }
        }

        // Both must have been processed (order non-deterministic but both must arrive).
        let finalState = await store.currentState()
        // State is unchanged by themeChanged (it emits an effect only).
        XCTAssertTrue(finalState.mainAppRunning)

        // Both effects must have been enqueued.
        // Give effects a moment to be dispatched to the runner.
        try? await Task.sleep(seconds: 0.05)
        let effects = mockRunner.ranEffects
        XCTAssertEqual(effects.count, 2)
    }

    // MARK: Effect completion round-trip

    func testEffectCompletionActionIsDispatchedBackToStore() async {
        let mockRunner = MockEffectRunner()
        // When setProtectionStatus runs, return a completion.
        mockRunner.setCompletion(
            for: .setProtectionStatus(enable: false),
            action: .setProtectionStatusCompleted(.success(Constants.knownTimestamp))
        )

        let initial = self.state(
            tabContext: Store.TabContext(
                windowToken: Constants.anyWindowToken,
                url: Constants.exampleURL,
                domain: Constants.exampleURL.host!,
                isSystemPage: false
            )
        )
        let store = PopupStore(
            initialState: initial,
            effectRunner: mockRunner
        )

        await store.dispatch(.pauseTapped)

        // Wait for the effect round-trip.
        try? await Task.sleep(seconds: 0.1)

        let finalState = await store.currentState()
        // After setProtectionStatusCompleted(.success), inFlight is cleared by the reducer.
        XCTAssertNil(finalState.inFlight)
        XCTAssertNil(finalState.lastError)
    }

    // MARK: Snapshot consistency under concurrent dispatch

    func testSnapshotReturnsConsistentStateUnder100ConcurrentDispatches() async {
        let mockRunner = MockEffectRunner()
        let store = PopupStore(
            initialState: self.state(),
            effectRunner: mockRunner
        )

        // Dispatch 100 actions concurrently.
        await withTaskGroup(of: Void.self) { group in
            for index in 0..<100 {
                group.addTask {
                    await store.dispatch(
                        .logLevelChanged(index.isMultiple(of: 2) ? .debug : .error)
                    )
                }
            }
        }

        // Snapshot must not crash and must return a valid state.
        let snap = store.snapshot()
        // State itself is unchanged by logLevelChanged (only effects).
        XCTAssertTrue(snap.mainAppRunning)
    }

    // MARK: Subscribe

    func testSubscribeDeliversUpdates() async {
        let mockRunner = MockEffectRunner()
        let store = PopupStore(
            initialState: self.state(mainAppRunning: false),
            effectRunner: mockRunner
        )

        // Collect one element from the stream.
        let task = Task<Store.State?, Never> {
            var iterator = await store.subscribe().makeAsyncIterator()
            return await iterator.next()
        }

        // Give the stream subscription a moment.
        try? await Task.sleep(seconds: 0.01)

        await store.dispatch(.mainAppRunningChanged(true))

        let received = await task.value
        XCTAssertEqual(received?.mainAppRunning, true)
    }

    func testSubscribeSkipsDuplicateState() async {
        let mockRunner = MockEffectRunner()
        let store = PopupStore(
            initialState: self.state(mainAppRunning: true),
            effectRunner: mockRunner
        )

        // Collect first emitted state.
        let task = Task<Store.State?, Never> {
            var iterator = await store.subscribe().makeAsyncIterator()
            return await iterator.next()
        }

        try? await Task.sleep(seconds: 0.01)

        // Same value — should NOT emit (dedup).
        await store.dispatch(.mainAppRunningChanged(true))
        // Different value — SHOULD emit.
        await store.dispatch(.mainAppRunningChanged(false))

        let received = await task.value
        XCTAssertEqual(received?.mainAppRunning, false)
    }

    func testTwoSubscribersReceiveUpdateIndependently() async {
        let mockRunner = MockEffectRunner()
        let store = PopupStore(
            initialState: self.state(mainAppRunning: false),
            effectRunner: mockRunner
        )

        let task1 = Task<Store.State?, Never> {
            var iterator = await store.subscribe().makeAsyncIterator()
            return await iterator.next()
        }
        let task2 = Task<Store.State?, Never> {
            var iterator = await store.subscribe().makeAsyncIterator()
            return await iterator.next()
        }

        // Give both subscriptions a moment to register.
        try? await Task.sleep(seconds: 0.01)

        await store.dispatch(.mainAppRunningChanged(true))

        let received1 = await task1.value
        let received2 = await task2.value
        XCTAssertEqual(received1?.mainAppRunning, true)
        XCTAssertEqual(received2?.mainAppRunning, true)
    }
}
