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
    func reload() async -> Bool {
        let bundleId = BuildConfig.AG_MAIL_EXTENSION_BUNDLEID
        do {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                MEExtensionManager.reloadContentBlocker(withIdentifier: bundleId) { error in
                    if let error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume()
                    }
                }
            }
            return true
        } catch {
            LogError("\(LogTag.mail) Reload failed: \(error.localizedDescription)")
            return false
        }
    }
}
