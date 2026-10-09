// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStatePushScheduler.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - URLFilterStatePushScheduler

/// Debounces URL-filter state assemblies and delivers them in issue order.
///
/// A newer event cancels the pending debounce but never drops an assembly that
/// is already running: delivery is gated by a monotonic sequence, so a slow
/// older assembly cannot overwrite a state that was already delivered, while
/// the newest completed assembly is still always delivered.
final class URLFilterStatePushScheduler {
    private let lock = NSLock()
    private let debounceSeconds: TimeInterval
    private let assemble: () async -> URLFilterUIState
    private let onDeliver: (URLFilterUIState) -> Void

    private var task: Task<Void, Never>?
    private var issuedSequence = 0
    private var deliveredSequence = 0

    /// Creates the scheduler.
    /// - Parameters:
    ///   - debounceSeconds: Delay that lets back-to-back events coalesce.
    ///   - assemble: Builds the state to deliver.
    ///   - deliver: Delivers a completed state; called under the scheduler's
    ///     lock, so it must not call back into the scheduler.
    init(
        debounceSeconds: TimeInterval,
        assemble: @escaping () async -> URLFilterUIState,
        deliver: @escaping (URLFilterUIState) -> Void
    ) {
        self.debounceSeconds = debounceSeconds
        self.assemble = assemble
        self.onDeliver = deliver
    }

    /// Schedules a debounced assembly, superseding any pending one.
    func schedule() {
        self.lock.lock()
        self.task?.cancel()
        self.issuedSequence += 1
        let sequence = self.issuedSequence
        let debounceSeconds = self.debounceSeconds
        self.task = Task { [weak self] in
            try? await Task.sleep(seconds: debounceSeconds)
            guard let self, !Task.isCancelled else { return }
            let state = await self.assemble()
            self.deliver(state, sequence: sequence)
        }
        self.lock.unlock()
    }

    /// Delivers `state` when `sequence` is newer than the last delivered one.
    ///
    /// The lock stays held across the delivery, so the callbacks reach the
    /// bridge in sequence order; the bridge only enqueues onto the main queue.
    private func deliver(_ state: URLFilterUIState, sequence: Int) {
        self.lock.lock()
        defer { self.lock.unlock() }
        guard sequence > self.deliveredSequence else { return }
        self.deliveredSequence = sequence
        self.onDeliver(state)
    }
}
