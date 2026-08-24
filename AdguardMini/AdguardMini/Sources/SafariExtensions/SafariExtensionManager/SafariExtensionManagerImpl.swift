// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensionManager.swift
//  AdguardMini
//

import Foundation
import SafariServices

import AML
import AMLC

// MARK: - SafariExtensionManagerImpl

final class SafariExtensionManagerImpl: SafariExtensionManager {
    private weak var delegate: ReloadExtensionDelegate?
    private let safariPopupApiClient: SafariPopupApi
    private let retryPolicy = RetryPolicy()
    private let sleep: @Sendable (TimeInterval) async throws -> Void
    private let reloadBlocker: @Sendable (SafariBlockerType) async throws -> Void
    private let logError: @Sendable (String) -> Void

    // Generations are per blocker so parallel reloads of different blockers
    // (reloadContentBlockers' task group) never cancel each other's retries.
    // Only a newer operation on the same blocker supersedes a pending retry.
    private let generationLock = UnfairLock()
    private var loadGenerations: [SafariBlockerType: UInt64] = [:]

    // MARK: Public methods

    /// - Parameters:
    ///   - delegate: Callback sink for reload lifecycle events.
    ///   - safariPopupApiClient: Popup API client (unused by reload).
    ///   - sleep: Suspension primitive used between retry attempts. Injected so
    ///     tests can drive the schedule deterministically.
    ///   - reloadBlocker: The per-type reload API call. Injected so tests can
    ///     substitute a fake; defaults to the real `SFContentBlockerManager`
    ///     call wrapped in `objcTryCatch`.
    ///   - logError: Sink for the single exhaustion error log. Injected so tests
    ///     can assert exactly one entry per exhausted blocker; defaults to
    ///     `LogError`.
    init(
        delegate: ReloadExtensionDelegate,
        safariPopupApiClient: SafariPopupApi,
        sleep: @escaping @Sendable (TimeInterval) async throws -> Void = { try await Task.sleep(seconds: $0) },
        reloadBlocker: @escaping @Sendable (SafariBlockerType) async throws -> Void = { type in
            try await SafariExtensionManagerImpl.reloadSFContentBlocker(type)
        },
        logError: @escaping @Sendable (String) -> Void = { LogError($0) }
    ) {
        self.delegate = delegate
        self.safariPopupApiClient = safariPopupApiClient
        self.sleep = sleep
        self.reloadBlocker = reloadBlocker
        self.logError = logError
    }

    @discardableResult
    func reloadContentBlocker(_ type: SafariBlockerType) async -> Bool {
        await self.onStartReload(type)

        if type == .advanced {
            return await self.reloadAdvancedBlocking()
        }

        let generation = self.bumpGeneration(for: type)
        return await self.runReloadLoop(type, generation: generation)
    }

    @discardableResult
    func reloadAllContentBlockers() async -> Bool {
        await self.reloadContentBlockers(SafariBlockerType.allCases)
    }

    /// Reloads the given blockers in parallel and aggregates their outcomes.
    ///
    /// Bumps the generation of each requested blocker up front so any pending
    /// retry on those types from a previous operation is superseded the instant
    /// this operation starts. Blockers not in `types` are left untouched: their
    /// pending retries keep running and release their own in-progress flags.
    /// - Parameter types: The blockers to reload.
    /// - Returns: True if every reload succeeded, otherwise false.
    @discardableResult
    func reloadContentBlockers(_ types: [SafariBlockerType]) async -> Bool {
        let uniqueTypes = Array(Set(types))
        for type in uniqueTypes {
            _ = self.bumpGeneration(for: type)
        }
        return await withTaskGroup(of: Bool.self) { group in
            for type in uniqueTypes {
                group.addTask {
                    await self.reloadContentBlocker(type)
                }
            }
            var numberOfFailed = 0
            for await isSuccess in group {
                numberOfFailed += isSuccess ? 0 : 1
            }
            return numberOfFailed == 0
        }
    }

    /// Runs the retry loop for one blocker under a captured generation. Aborts
    /// without another Safari call once the task is cancelled or a newer
    /// operation has superseded this one. A cancellation abort that still owns
    /// the generation releases the in-progress flag with an abort report; a
    /// superseded abort stays silent so it cannot clobber the newer
    /// operation's state.
    private func runReloadLoop(
        _ type: SafariBlockerType,
        generation: UInt64
    ) async -> Bool {
        let reloadStart = Date()
        LogInfo("\(LogTag.safari) reloadContentBlocker(\(type)) start")

        var lastError: Error?

        for attempt in 1...self.retryPolicy.maxAttempts {
            if Task.isCancelled {
                // A cancelled stale loop must not report.
                // A newer operation on this blocker owns the in-progress flag.
                // Only its own end report may re-establish the final state.
                if !self.isSuperseded(type: type, generation: generation) {
                    await self.finishAbortForCancellation(type, generation: generation)
                }
                return false
            }
            if self.isSuperseded(type: type, generation: generation) {
                // A newer operation on this blocker owns the in-progress flag.
                // Its own start/end pair clears that flag.
                // A report from this stale loop could clobber its status.
                // The superseded loop stays silent, so no report is emitted.
                return false
            }

            do {
                try await self.reloadBlocker(type)
                return await self.reportSuccess(
                    type,
                    generation: generation,
                    reloadStart: reloadStart
                )
            } catch {
                lastError = error
                guard self.retryPolicy.shouldRetry(after: attempt) else { break }
                let delay = self.retryPolicy.delay(after: attempt)
                do {
                    try await self.sleep(delay)
                } catch {
                    // The production `Task.sleep` throws only on cancellation.
                    // Releasing the flag prevents a stranded `.loading` state.
                    // A cancelled stale loop stays silent.
                    // The newer operation reports its own end.
                    if !self.isSuperseded(type: type, generation: generation),
                       Task.isCancelled {
                        await self.finishAbortForCancellation(type, generation: generation)
                    }
                    return false
                }
            }
        }

        await self.reportFailure(
            type,
            generation: generation,
            lastError: lastError,
            reloadStart: reloadStart
        )
        return false
    }

    /// Reports a successful reload, but only if this loop still owns the
    /// blocker. A newer operation may own it by the time Safari returns, and a
    /// stale success could clear its freshly persisted `.safariError`.
    private func reportSuccess(
        _ type: SafariBlockerType,
        generation: UInt64,
        reloadStart: Date
    ) async -> Bool {
        guard !self.isSuperseded(type: type, generation: generation) else { return false }
        LogInfo("\(LogTag.safari) reloadContentBlocker(\(type)) end, \(reloadStart.elapsedMs())")
        await self.onEndReload(type, error: nil)
        return true
    }

    /// Reports the post-retry outcome, but only if this loop still owns the
    /// blocker. A stale failure could otherwise overwrite a newer operation's
    /// status. Logs the exhaustion error regardless, as it is diagnostic only.
    private func reportFailure(
        _ type: SafariBlockerType,
        generation: UInt64,
        lastError: Error?,
        reloadStart: Date
    ) async {
        if let lastError {
            self.logError(
                "\(LogTag.safari) reloadContentBlocker(\(type)) exhausted after " +
                "\(self.retryPolicy.maxAttempts) attempts (error: " +
                "\(SafariError(lastError))), \(reloadStart.elapsedMs())"
            )
        }
        // Re-check ownership before the final failure report.
        guard !self.isSuperseded(type: type, generation: generation) else { return }
        await self.onEndReload(type, error: lastError)
    }

    /// Releases the in-progress flag when a reload abandons its retry loop
    /// because the task was cancelled. Keeps a cancelled blocker from staying
    /// stuck on `.loading`. The abort report clears the flag without rewiring
    /// the stored error: no actual reload happened, so a previously persisted
    /// `.safariError` must survive.
    private func finishAbortForCancellation(
        _ type: SafariBlockerType,
        generation: UInt64
    ) async {
        // A newer operation may own the blocker by the time we report.
        // A stale abort could otherwise clear a newer reload's flag.
        guard !self.isSuperseded(type: type, generation: generation) else { return }
        LogDebug("\(LogTag.safari) reloadContentBlocker(\(type)) aborted (cancelled)")
        await self.onEndReloadAbort(type)
    }

    private func reloadAdvancedBlocking() async -> Bool {
        await self.onEndReload(.advanced, error: nil)
        return true
    }

    private func onStartReload(_ type: SafariBlockerType) async {
        await self.delegate?.onStartReload(blockerType: type)
    }

    private func onEndReload(_ type: SafariBlockerType, error: Error?) async {
        await self.delegate?.onEndReload(
            .init(
                blockerType: type,
                error: error
            )
        )
    }

    private func onEndReloadAbort(_ type: SafariBlockerType) async {
        await self.delegate?.onEndReload(
            .init(
                blockerType: type,
                error: nil,
                isAborted: true
            )
        )
    }

    // MARK: Generation

    /// Bumps the reload generation for `type` and returns the new value. Every
    /// reload operation re-tags its own blocker, so an in-flight retry that
    /// captured an older tag is superseded and must abort.
    private func bumpGeneration(for type: SafariBlockerType) -> UInt64 {
        locked(self.generationLock) {
            self.loadGenerations[type, default: 0] &+= 1
            return self.loadGenerations[type, default: 0]
        }
    }

    /// Whether a newer reload operation has superseded `generation` for `type`.
    private func isSuperseded(type: SafariBlockerType, generation: UInt64) -> Bool {
        locked(self.generationLock) {
            (self.loadGenerations[type] ?? 0) != generation
        }
    }

    /// Invokes the real Safari reload API and maps the result — including any
    /// Obj-C exception — into a Swift `Error`. Extracted out of the retry loop
    /// so tests can substitute a fake via the `reloadBlocker` injection point.
    private static func reloadSFContentBlocker(_ type: SafariBlockerType) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            let exception = objcTryCatch {
                SFContentBlockerManager.reloadContentBlocker(withIdentifier: type.bundleId) { error in
                    if let error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume()
                    }
                }
            }
            if let exception {
                let error = exception.transformAndLog(
                    domain: .safariServices,
                    file: #fileID,
                    function: #function,
                    line: #line
                )
                continuation.resume(throwing: error)
            }
        }
    }
}
