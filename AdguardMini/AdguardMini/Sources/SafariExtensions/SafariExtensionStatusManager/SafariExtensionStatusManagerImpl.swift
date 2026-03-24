// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensionStatusManager.swift
//  AdguardMini
//

import Foundation
import SafariServices

import AML
import AMLC

// MARK: - SafariExtensionStatusManagerImpl

final class SafariExtensionStatusManagerImpl: SafariExtensionStatusManager {
    private struct CachedResult {
        private let ttl: TimeInterval = 0.375.seconds
        let isEnabled: Bool
        let timestamp: Date

        func isValid() -> Bool {
            Date.now.timeIntervalSince(self.timestamp) < self.ttl
        }
    }

    private var cache: [SafariBlockerType: CachedResult] = [:]
    private let safariAPILock = AsyncSerialLock()
    private let lock = UnfairLock()

    var isAllExtensionsEnabled: Bool {
        get async {
            await self.firstDisabledExtensionId == nil
        }
    }

    var firstDisabledExtensionId: String? {
        get async {
            var disabledExtension: String?
            for blockerType in SafariBlockerType.allCases
            where await !self.checkIfExtensionEnabled(blockerType) {
                disabledExtension = blockerType.bundleId
                break
            }
            return disabledExtension
        }
    }

    func checkIfExtensionEnabled(_ type: SafariBlockerType) async -> Bool {
        self.lock.lock()
        if let cached = self.cache[type], cached.isValid() {
            self.lock.unlock()
            LogDebug("[ExtStatus] \(type) — cached: isEnabled=\(cached.isEnabled)")
            return cached.isEnabled
        }
        self.lock.unlock()

        // All calls must be made sequentially, as the API sometimes struggles with large numbers of calls.
        // For example, there are a large number of "Over-resume of a connection. > XPC API Misuse: Over-resume of a connection." crashes on macOS 12 and 13 on Intel processors.
        // AsyncSerialLock ensures strict serialization without reentrancy (unlike actor)
        await self.safariAPILock.lock()
        defer {
            self.safariAPILock.unlock()
        }

        var isEnabled: Bool
        do {
            isEnabled = if type != .advanced {
                try await SFContentBlockerManager.stateOfContentBlocker(withIdentifier: type.bundleId).isEnabled
            } else {
                try await SFSafariExtensionManager.stateOfSafariExtension(withIdentifier: type.bundleId).isEnabled
            }
            LogDebug("[ExtStatus] \(type) (\(type.bundleId)): isEnabled=\(isEnabled)")
        } catch {
            isEnabled = false
            LogError("Error checking \(type) extension state: \(SafariError(error))")
        }

        // Diagnostic: also try SFSafariExtensionManager for content blockers to compare results
        if type != .advanced {
            do {
                let altEnabled = try await SFSafariExtensionManager
                    .stateOfSafariExtension(withIdentifier: type.bundleId).isEnabled
                if altEnabled != isEnabled {
                    LogWarn(
                        "[ExtStatus] \(type) MISMATCH: " +
                        "SFContentBlockerManager=\(isEnabled), " +
                        "SFSafariExtensionManager=\(altEnabled)"
                    )
                } else {
                    LogDebug(
                        "[ExtStatus] \(type) alt check (SFSafariExtensionManager): " +
                        "isEnabled=\(altEnabled) (matches)"
                    )
                }
            } catch {
                LogDebug(
                    "[ExtStatus] \(type) alt check (SFSafariExtensionManager) failed: \(error)"
                )
            }
        }

        locked(self.lock) {
            self.cache[type] = CachedResult(isEnabled: isEnabled, timestamp: Date())
        }
        return isEnabled
    }
}
