// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariApiInteractor.swift
//  PopupExtension
//

import Foundation
import AML

// MARK: - SafariApiInteractorError

enum SafariApiInteractorError: Error {
    case bothReplyParamsAreNil
    case objectDeinited
}

// MARK: - SafariApiInteractor

protocol SafariApiInteractor {
    func appState(after time: EBATimestamp) async throws -> EBAAppState
    func appState() async throws -> EBAAppState
    func getCurrentFilteringState(withUrl url: String) async throws -> EBACurrentFilteringState
    func getExtraState(withUrl url: String) async throws -> Bool
    func isAllExtensionsEnabled() async throws -> Bool
    func isOnboardingCompleted() async throws -> Bool

    func setProtectionStatus(_ enabled: Bool) async throws -> EBATimestamp
    func setFilteringStatusWithUrl(_ url: String, isEnabled: Bool) async throws -> EBATimestamp
    func addRule(_ ruleText: String) async throws

    func reportSite(with url: String) async throws -> String

    func openSafariSettings() async throws

    func telemetryPageViewEvent(_ screen: Telemetry.Screen) async throws
    func telemetryActionEvent(_ action: Telemetry.Action, screen: Telemetry.Screen) async throws

    func notifyWindowOpened() async throws
}

// MARK: - SafariApiInteractorImpl

/// More convenient wrapper for ``ExtensionSafariApiClientManager``.
final class SafariApiInteractorImpl: SafariApiInteractor {
    private let safariApi: ExtensionSafariApiClientManager

    init(safariApi: ExtensionSafariApiClientManager) {
        self.safariApi = safariApi
    }

    func appState(after time: EBATimestamp) async throws -> EBAAppState {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.appState(after: time, reply: continuation.callback)
        }
    }

    func appState() async throws -> EBAAppState {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.appState(continuation.callback)
        }
    }

    func getCurrentFilteringState(withUrl url: String) async throws -> EBACurrentFilteringState {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.getCurrentFilteringState(withUrl: url, reply: continuation.callback)
        }
    }

    func getExtraState(withUrl url: String) async throws -> Bool {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.getExtraState(withUrl: url, reply: continuation.callback)
        }
    }

    func isAllExtensionsEnabled() async throws -> Bool {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.isAllExtensionsEnabled(reply: continuation.callback)
        }
    }

    func isOnboardingCompleted() async throws -> Bool {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.isOnboardingCompleted(reply: continuation.callback)
        }
    }

    func setProtectionStatus(_ enabled: Bool) async throws -> EBATimestamp {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.setProtectionStatus(enabled, reply: continuation.callback)
        }
    }

    func setFilteringStatusWithUrl(_ url: String, isEnabled: Bool) async throws -> EBATimestamp {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.setFilteringStatusWithUrl(url, isEnabled: isEnabled, reply: continuation.callback)
        }
    }

    func addRule(_ ruleText: String) async throws {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.addRule(ruleText, reply: continuation.callback)
        }
    }

    func reportSite(with url: String) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.reportSite(with: url, reply: continuation.callback)
        }
    }

    func openSafariSettings() async throws {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.openSafariSettings(reply: continuation.callback)
        }
    }

    func telemetryPageViewEvent(_ screen: Telemetry.Screen) async throws {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.telemetryPageViewEvent(screen.rawValue, reply: continuation.callback)
        }
    }

    func telemetryActionEvent(_ action: Telemetry.Action, screen: Telemetry.Screen) async throws {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.telemetryActionEvent(
                screenName: screen.rawValue,
                action: action.rawValue,
                reply: continuation.callback
            )
        }
    }

    func notifyWindowOpened() async throws {
        try await withCheckedThrowingContinuation { continuation in
            self.safariApi.notifyWindowOpened(reply: continuation.callback)
        }
    }
}

private extension CheckedContinuation where T == Void, E == Error {
    var callback: (E?) -> Void {
        { error in
            if let err = error {
                self.resume(throwing: err)
            } else {
                self.resume()
            }
        }
    }
}

private extension CheckedContinuation where E == Error {
    var callback: (T?, E?) -> Void {
        { result, error in
            if let err = error {
                self.resume(throwing: err)
            } else if let val = result {
                self.resume(returning: val)
            } else {
                self.resume(throwing: SafariApiInteractorError.bothReplyParamsAreNil)
            }
        }
    }
}
