// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LoginItemService.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - LoginItemServiceDelegate

/// Receives a late login-item success.
@MainActor
protocol LoginItemServiceDelegate: AnyObject {
    /// Called for a late success only, not for attempt 1 or an exhausted outcome.
    func registrationSuccessful()
}

// MARK: - LoginItemService

/// Registers the helper and recovers a failed attempt.
@MainActor
protocol LoginItemService: AnyObject {
    /// Receives the late-success callback.
    var delegate: LoginItemServiceDelegate? { get set }

    /// Registers the helper; a failure starts the retry or the approval watch.
    /// - Returns: `true` only when the helper is usable.
    func tryRegisterHelper() -> Bool

    /// Cancels both recovery loops.
    func stop()
}

// MARK: - LoginItemServiceImpl

/// Registers the helper and runs both recovery loops on the main actor.
@MainActor
final class LoginItemServiceImpl: LoginItemService {
    private enum Constants {
        static let retryPolicy = RetryPolicy(maxAttempts: 5, baseDelaySeconds: 5)
        static let approvalPollInterval: TimeInterval = 2
    }

    private let manager: LoginItemManager
    private let retryPolicy: RetryPolicy
    private let approvalPollInterval: TimeInterval
    private var retryTask: Task<Void, Never>?
    private var watchTask: Task<Void, Never>?

    weak var delegate: LoginItemServiceDelegate?

    /// Creates the service with the production recovery schedule.
    nonisolated convenience init(manager: LoginItemManager) {
        self.init(
            manager: manager,
            retryPolicy: Constants.retryPolicy,
            approvalPollInterval: Constants.approvalPollInterval
        )
    }

    /// Creates the service with an explicit recovery schedule.
    nonisolated init(
        manager: LoginItemManager,
        retryPolicy: RetryPolicy,
        approvalPollInterval: TimeInterval
    ) {
        self.manager = manager
        self.retryPolicy = retryPolicy
        self.approvalPollInterval = approvalPollInterval
    }

    func tryRegisterHelper() -> Bool {
        let status = self.manager.checkAndRegisterHelper()
        switch status {
        case .enabled:
            LogInfo("LoginItem registration succeeded on attempt 1 of \(self.retryPolicy.maxAttempts)")
            return true
        case .requiresApproval:
            LogWarn("LoginItem registration attempt 1 of \(self.retryPolicy.maxAttempts) requires approval")
            self.startWatch()
            return false
        case .notRegistered, .notFound, .unexpected:
            LogWarn("LoginItem registration attempt 1 of \(self.retryPolicy.maxAttempts) failed: \(status)")
            self.startRetry()
            return false
        }
    }

    func stop() {
        self.retryTask?.cancel()
        self.watchTask?.cancel()
        self.retryTask = nil
        self.watchTask = nil
    }

    /// Retries the registration, waiting longer after each failure.
    private func startRetry() {
        guard self.retryTask == nil else { return }
        self.retryTask = Task { @MainActor [weak self] in
            guard let self else { return }
            let maxAttempts = self.retryPolicy.maxAttempts
            for attempt in stride(from: 2, through: maxAttempts, by: 1) {
                let delay = self.retryPolicy.delay(after: attempt - 1)
                LogInfo("LoginItem registration attempt \(attempt) of \(maxAttempts) in \(delay) s")
                guard await self.wait(delay) else {
                    self.retryTask = nil
                    return
                }
                var status = self.manager.checkHelperStatus()
                switch status {
                case .notRegistered, .notFound:
                    status = self.manager.registerHelper()
                case .enabled, .requiresApproval, .unexpected:
                    break
                }
                switch status {
                case .enabled:
                    let message = "LoginItem registration succeeded on attempt \(attempt) of \(maxAttempts)"
                    self.finishSuccess(message: message)
                    return
                case .requiresApproval:
                    LogWarn("LoginItem registration attempt \(attempt) of \(maxAttempts) requires approval")
                    self.retryTask = nil
                    self.startWatch()
                    return
                case .notRegistered, .notFound, .unexpected:
                    LogWarn("LoginItem registration attempt \(attempt) of \(maxAttempts) failed: \(status)")
                    if !self.retryPolicy.shouldRetry(after: attempt) {
                        LogError("LoginItem registration failed after \(maxAttempts) attempts: \(status)")
                    }
                }
            }
            self.retryTask = nil
        }
    }

    /// Watches for the user's approval until the helper becomes usable.
    private func startWatch() {
        guard self.watchTask == nil else { return }
        LogInfo("LoginItem registration approval watch started")
        self.watchTask = Task { @MainActor [weak self] in
            guard let self else { return }
            while true {
                guard await self.wait(self.approvalPollInterval) else {
                    self.watchTask = nil
                    return
                }
                let status = self.manager.checkHelperStatus()
                switch status {
                case .requiresApproval:
                    continue
                case .enabled:
                    self.finishSuccess(message: "LoginItem registration succeeded: helper approved")
                    return
                case .notRegistered, .notFound:
                    LogError("LoginItem registration approval watch stopped: \(status)")
                    self.watchTask = nil
                    self.startRetry()
                    return
                case .unexpected:
                    LogError("LoginItem registration approval watch stopped: \(status)")
                    self.watchTask = nil
                    return
                }
            }
        }
    }

    /// Reports a late success and clears both loop handles.
    private func finishSuccess(message: String) {
        LogInfo(message)
        self.delegate?.registrationSuccessful()
        self.retryTask = nil
        self.watchTask = nil
    }

    /// Waits for the interval; returns `false` when the task is cancelled.
    private func wait(_ interval: TimeInterval) async -> Bool {
        do {
            try await Task.sleep(seconds: interval)
        } catch {
            return false
        }
        return !Task.isCancelled
    }
}
