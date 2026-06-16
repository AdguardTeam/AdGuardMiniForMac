// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LicenseStateProvider.swift
//  AdguardMini
//

import Foundation
import AML
#if MAS
import StoreKit
import AppStore
#endif

// MARK: - TrialAvailability

/// Describes whether a free trial is available for the current user
/// and how many days it lasts.
struct TrialAvailability {
    let isAvailable: Bool
    let availableDays: Int

    static let unavailable = TrialAvailability(isAvailable: false, availableDays: 0)
}

// MARK: - LicenseStateProvider

protocol LicenseStateProvider: AnyObject {
    /// Returns stored app status info from secure storage.
    func getStoredInfo() async -> AppStatusInfo?

    /// Returns whether license reset is allowed for the provided license or for the current stored state.
    func canReset(for license: AppStatusInfo?) async -> Bool

    /// Returns trial availability state for the current release variant.
    func getTrialAvailability() async -> TrialAvailability

    #if MAS
    /// Resolves trial availability from already fetched App Store subscriptions.
    func getTrialAvailability(from products: [AppStoreProductInfo]) -> TrialAvailability
    #endif
}

// MARK: - LicenseStateProviderImpl

class LicenseStateProviderBase: LicenseStateProvider {
    private let keychain: KeychainManager

    init(keychain: KeychainManager) {
        self.keychain = keychain
    }

    func getStoredInfo() async -> AppStatusInfo? {
        await self.keychain.getAppStatusInfo()
    }

    func canReset(for license: AppStatusInfo?) async -> Bool {
        true
    }

    func getTrialAvailability() async -> TrialAvailability {
        .unavailable
    }

    #if MAS
    func getTrialAvailability(from products: [AppStoreProductInfo]) -> TrialAvailability {
        .unavailable
    }
    #endif
}

#if MAS

final class LicenseStateProviderImpl: LicenseStateProviderBase {
    // MARK: Private properties

    private let appStoreInteractor: AppStoreInteractor
    private let eventBus: EventBus

    /// Cached trial availability value. `nil` means cache miss.
    private var cachedTrialAvailability: TrialAvailability?

    /// Box for in-flight task identity comparison.
    private final class InFlightTaskBox {
        let task: Task<TrialAvailability, Error>

        init(task: Task<TrialAvailability, Error>) {
            self.task = task
        }
    }

    /// In-flight fetch task box for request coalescing.
    private var inFlightTaskBox: InFlightTaskBox?

    /// Lock protecting `cachedTrialAvailability` and `inFlightTask`.
    private let cacheLock = UnfairLock()

    // MARK: Init

    init(keychain: KeychainManager, appStoreInteractor: AppStoreInteractor, eventBus: EventBus) {
        self.appStoreInteractor = appStoreInteractor
        self.eventBus = eventBus

        super.init(keychain: keychain)

        self.eventBus.subscribe(
            observer: self,
            selector: #selector(self.handleTransactionUpdated),
            event: .appStoreTransactionUpdated
        )
    }

    deinit {
        self.eventBus.unsubscribeAll(observer: self)
    }

    // MARK: Public methods

    override func canReset(for appStatusInfo: AppStatusInfo?) async -> Bool {
        var info: AppStatusInfo?
        if let appStatusInfo {
            LogDebug("Use provided info")
            info = appStatusInfo
        } else {
            LogDebug("Use stored info")
            info = await self.getStoredInfo()
        }
        guard let info else {
            LogDebug("Info is nil. Can reset license")
            return true
        }

        // Non-App Store subscriptions can always be reset
        guard info.isAppStoreSubscription else {
            LogDebug("Non-AppStore subscription. Can reset license")
            return true
        }

        let hasActiveEntitlement = await self.appStoreInteractor.hasActiveEntitlement()
        let canReset = !hasActiveEntitlement
        LogDebug("Has active entitlement: \(hasActiveEntitlement). Can reset license: \(canReset)")
        return canReset
    }

    override func getTrialAvailability() async -> TrialAvailability {
        // Check cache first
        let cached = locked(self.cacheLock) { self.cachedTrialAvailability }
        if let cached {
            LogDebug("Trial availability cache hit: isAvailable=\(cached.isAvailable), days=\(cached.availableDays)")
            return cached
        }

        // Check for in-flight task (request coalescing)
        let existingTask = locked(self.cacheLock) { self.inFlightTaskBox?.task }
        if let existingTask {
            LogDebug("Trial availability fetch already in progress, coalescing")
            do {
                return try await existingTask.value
            } catch {
                LogError("Coalesced trial availability fetch failed: \(error)")
                return .unavailable
            }
        }

        // Start new fetch — use throwing task to distinguish success from failure
        let task = Task<TrialAvailability, Error> {
            let products = try await self.appStoreInteractor.getAvailableSubscriptions()
            return self.getTrialAvailability(from: products)
        }
        let box = InFlightTaskBox(task: task)
        locked(self.cacheLock) { self.inFlightTaskBox = box }

        do {
            let result = try await task.value

            // Cache only successful results (including "unavailable" when no trial products exist)
            locked(self.cacheLock) {
                if self.inFlightTaskBox === box {
                    self.inFlightTaskBox = nil
                }
                self.cachedTrialAvailability = result
            }

            LogDebug("Trial availability cached: isAvailable=\(result.isAvailable), days=\(result.availableDays)")
            return result
        } catch {
            // Clear in-flight task on failure; do not cache the failure
            locked(self.cacheLock) {
                if self.inFlightTaskBox === box {
                    self.inFlightTaskBox = nil
                }
            }

            LogError("Failed to resolve trial availability: \(error)")
            return .unavailable
        }
    }

    override func getTrialAvailability(from products: [AppStoreProductInfo]) -> TrialAvailability {
        for product in products {
            let isFreeTrialAvailable = product.isEligibleForIntroOffer
            && product.introductoryOffer?.paymentMode == .freeTrial
            if isFreeTrialAvailable {
                let availableDays = product.introductoryOffer?.period.value ?? 0
                return TrialAvailability(isAvailable: true, availableDays: availableDays)
            }
        }

        return .unavailable
    }

    // MARK: Private methods

    @objc private func handleTransactionUpdated(_: Notification) {
        self.invalidateTrialAvailabilityCache()
    }

    /// Clears the cached trial availability value, forcing a fresh fetch on next access.
    private func invalidateTrialAvailabilityCache() {
        locked(self.cacheLock) { self.cachedTrialAvailability = nil }
        LogDebug("Trial availability cache invalidated")
    }
}
#else

final class LicenseStateProviderImpl: LicenseStateProviderBase {
    // MARK: Private properties

    private let backendService: BackendService

    // MARK: Init

    init(keychain: KeychainManager, backendService: BackendService) {
        self.backendService = backendService

        super.init(keychain: keychain)
    }

    // MARK: Public methods

    override func getTrialAvailability() async -> TrialAvailability {
        guard let trialInfo = await self.backendService.trialInfo,
              trialInfo.isAvailable else {
            return .unavailable
        }

        return TrialAvailability(
            isAvailable: true,
            availableDays: trialInfo.durationDays
        )
    }
}

#endif
