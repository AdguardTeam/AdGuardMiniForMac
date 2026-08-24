// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailExtensionReloader.swift
//  AdguardMini
//

import Foundation
import MailKit
import AML

protocol MailExtensionReloader {
    func reload() async -> Bool
}

final class MailExtensionReloaderImpl: MailExtensionReloader {
    private let reloadBlocker: @Sendable () async throws -> Void

    /// - Parameter reloadBlocker: The MailKit reload API call. Injected so tests
    ///     can substitute a fake and assert that only one call is ever made
    ///     (the Safari retry policy deliberately does not apply to mail reloads).
    init(
        reloadBlocker: @escaping @Sendable () async throws -> Void = {
            try await MailExtensionReloaderImpl.reloadMailExtension()
        }
    ) {
        self.reloadBlocker = reloadBlocker
    }

    func reload() async -> Bool {
        do {
            try await self.reloadBlocker()
            return true
        } catch {
            LogError("\(LogTag.mail) Reload failed: \(error.localizedDescription)")
            return false
        }
    }

    /// Invokes MailKit's reload API exactly once (no retry loop).
    private static func reloadMailExtension() async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            MEExtensionManager.reloadContentBlocker(withIdentifier: BuildConfig.AG_MAIL_EXTENSION_BUNDLEID) { error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }
}
