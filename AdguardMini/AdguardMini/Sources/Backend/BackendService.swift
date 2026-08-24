// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  BackendService.swift
//  AdguardMini
//

import Foundation

import AML
import AppBackend

// MARK: - Constants

private enum Constants {
    static let backendRequestKey = SensitiveBuildConfig.SENS_BACKEND_REQUEST_KEY
    static let userAgentString = ProductInfo.userAgentString

    static let refreshAppStatusInfoInterval: Double = 1.hour
    static let networkRelaxationTimeout: TimeInterval = 5.seconds
    /// How often the background keeps the shared promo cache fresh.
    /// The refresh loop is independent of popup opens, so `createAppState`
    /// never triggers promo work and stays side-effect free.
    static let promoInfoRefreshInterval: TimeInterval = 1.hour
}

// MARK: - BackendServiceError

enum BackendServiceError: Error {
    case notConnectedToInternet
}

// MARK: - CommonBackendParameters

/// Common static parameters for our backend services.
enum CommonBackendParameters {
    /// In other words this is an application type.
    static let appSlug = "SAFARI"
}

// MARK: - BackendService

protocol BackendService {
    var trialInfo: TrialInfo? { get async }

    func webActivateApp(from screen: String) async throws -> WebActivateResult
    func webRequestTrial(from screen: String) async throws -> WebActivateResult
    func webBindKeyToOwner(licenseKey: String, from screen: String) async throws -> WebActivateResult
    func cancelWebSession() async

    func activateApp(appKey: String) async throws -> ActivationResponse.ApplicationKeyStatus
    func refreshAppStatusInfo() async throws
    func validateReceipt(jws: String, restore: Bool) async throws -> ValidateReceiptResponse

    func promoInfo() async throws -> PromotionResponse

    /// Returns the cached promo info without a network call.
    /// Used by the Safari popup path so app-state replies never block.
    func cachedPromoInfo() async -> PromotionResponse?

    func startPurchaseFlow(from screen: String) async throws
    func startRenewalFlow(licenseKey: String, from screen: String) async throws

    func logout() async throws

    func bootstrap() async

    func getStoredAppStatusInfo() async -> AppStatusInfo?
}

// MARK: - BackendServiceImpl

final actor BackendServiceImpl: BackendService {
    // MARK: Endpoints

    private let webFlowService: WebFlowService
    private let subscribeWebFlowService: SubscribeWebFlowService
    private let licenseService: LicenseService

    // MARK: Dependencies

    private let productInfo: ProductInfoStorage
    private let keychain: KeychainManager

    private let netReachability: NetworkReachability

    private let eventBus: EventBus

    // MARK: Private properties

    private var checkStatusLoopTask: Task<Void, Never>?
    private var networkStatusTask: Task<Void, Never>?

    private let lock = UnfairLock()
    private var isBootstrapped = false

    // MARK: Promo info cache

    /// Cached promo info. `nil` means a cache miss.
    /// Kept fresh by the hourly background loop and by paywall refreshes.
    private var promoInfoCache: PromotionResponse?

    /// Hourly background promo refresh task.
    private var promoInfoRefreshTask: Task<Void, Never>?

    // MARK: Public properties

    private(set) var trialInfo: TrialInfo?

    // MARK: Public methods

    init(
        webFlowService: WebFlowService,
        subscribeWebFlowService: SubscribeWebFlowService,
        licenseService: LicenseService,
        productInfo: ProductInfoStorage,
        keychain: KeychainManager,
        netReachability: NetworkReachability,
        eventBus: EventBus
    ) {
        LogDebugTrace()

        self.webFlowService = webFlowService
        self.subscribeWebFlowService = subscribeWebFlowService
        self.licenseService = licenseService
        self.productInfo = productInfo
        self.keychain = keychain
        self.netReachability = netReachability
        self.eventBus = eventBus

        AppBackend.Core.configure(
            backendRequestKey: Constants.backendRequestKey,
            userAgentString: Constants.userAgentString,
            backendApiUrlOverride: DeveloperConfigUtils[.backendApiUrl] as? String,
            webApiUrlOverride: DeveloperConfigUtils[.webApiUrl] as? String,
            subscribeApiUrlOverride: DeveloperConfigUtils[.subscribeApiUrl] as? String,
            reportsApiUrlOverride: DeveloperConfigUtils[.reportsApiUrl] as? String
        )
    }

    deinit {
        self.checkStatusLoopTask?.cancel()
        self.networkStatusTask?.cancel()
        self.promoInfoRefreshTask?.cancel()
    }

    func webActivateApp(from screen: String) async throws -> WebActivateResult {
        LogDebugTrace()
        self.ensureBootstrapped()

        self.webFlowService.cancelWebSession()
        let result = try await self.webFlowService.activate(from: screen)
        if result == .success {
            try await self.refreshAppStatusInfo()
        }
        return result
    }

    func webRequestTrial(from screen: String) async throws -> WebActivateResult {
        LogDebugTrace()
        self.ensureBootstrapped()

        self.webFlowService.cancelWebSession()
        let result = try await self.webFlowService.activateTrial(from: screen)
        if result == .success {
            try await self.refreshAppStatusInfo()
        }
        return result
    }

    func webBindKeyToOwner(licenseKey: String, from screen: String) async throws -> WebActivateResult {
        LogDebugTrace()
        self.ensureBootstrapped()

        self.webFlowService.cancelWebSession()
        let result = try await self.webFlowService.bindLicense(licenseKey: licenseKey, from: screen)
        if result == .success {
            try await self.refreshAppStatusInfo()
        }
        return result
    }

    func cancelWebSession() async {
        LogDebugTrace()
        self.ensureBootstrapped()

        self.webFlowService.cancelWebSession()
    }

    func startPurchaseFlow(from screen: String) async throws {
        LogDebugTrace()
        self.ensureBootstrapped()

        try await self.subscribeWebFlowService.startPurchaseFlow(from: screen)
    }

    func startRenewalFlow(licenseKey: String, from screen: String) async throws {
        LogDebugTrace()
        self.ensureBootstrapped()

        try await self.subscribeWebFlowService.startRenewalFlow(licenseKey: licenseKey, from: screen)
    }

    func activateApp(appKey: String) async throws -> ActivationResponse.ApplicationKeyStatus {
        LogDebugTrace()
        self.ensureBootstrapped()

        try self.checkNetworkReachability()
        let response = try await self.licenseService.activateApp(appKey: appKey)
        LogInfo("App activation status: \(response.applicationKeyStatus)")
        try await self.refreshAppStatusInfo()
        return response.applicationKeyStatus
    }

    func refreshAppStatusInfo() async throws {
        LogDebugTrace()
        self.ensureBootstrapped()

        try self.checkNetworkReachability()
        let oldStatusInfo = await self.keychain.getAppStatusInfo()
        do {
            let response = try await self.licenseService.requestAppStatus()

            self.trialInfo = response.extendedTrialInfo?.toAppDomain()
            let appStatusInfo = response.toAppStatus()
            await self.keychain.setAppStatusInfo(appStatusInfo)

            LogInfo("App status refreshed: \(appStatusInfo.licenseStatus)")
            self.postLicenseUpdateEventIfNeedIt(old: oldStatusInfo, new: appStatusInfo)
        } catch {
            LogError("Something went wrong on app status refresh info: \(error)")
            await self.fallbackToFreeLicense(with: error)
            throw error
        }
    }

    func validateReceipt(jws: String, restore: Bool) async throws -> ValidateReceiptResponse {
        LogDebugTrace()
        self.ensureBootstrapped()

        try self.checkNetworkReachability()
        do {
            let response = try await self.licenseService
                .validateReceipt(
                    jws: jws,
                    restore: restore
                )
            LogInfo("Transaction validation response: \(response.applicationKeyStatus)")
            try await self.refreshAppStatusInfo()
            return response
        } catch {
            LogError("Something went wrong on validate receipt: \(error)")
            await self.fallbackToFreeLicense(with: error)
            throw error
        }
    }

    func logout() async throws {
        LogDebugTrace()
        self.ensureBootstrapped()

        try self.checkNetworkReachability()
        try await self.licenseService.resetLicense()
        await self.keychain.delete(key: .licenseInfo)
        LogInfo("Logout succeeded")
        try await self.refreshAppStatusInfo()
    }

    func promoInfo() async throws -> PromotionResponse {
        LogDebugTrace()

        // The paywall is the refresh trigger and updates the shared cache.
        // Fresh promo content is then served to the Safari popup path.
        return try await self.fetchAndCachePromoInfo()
    }

    func cachedPromoInfo() async -> PromotionResponse? {
        LogDebugTrace()
        return self.promoInfoCache
    }

    func getStoredAppStatusInfo() async -> AppStatusInfo? {
        await self.keychain.getAppStatusInfo()
    }

    func bootstrap() {
        LogDebug("Start backend service bootstrap")

        locked(self.lock) { self.isBootstrapped = true }

        if self.netReachability.isAvailable() {
            self.makeCheckStatusLoop()
        } else {
            self.makeNetworkStatusLoop()
        }

        #if MAS
        // Pre-warm the promo cache at startup and keep it fresh hourly.
        // The Safari popup path never triggers promo work itself.
        self.makePromoInfoRefreshLoop()
        #endif
    }

    // MARK: Private methods

    private func ensureBootstrapped() {
        var shouldBootstrap: Bool = false
        locked(self.lock) {
            assert(self.isBootstrapped, "Service not bootstrapped")
            shouldBootstrap = !self.isBootstrapped
        }

        if shouldBootstrap {
            self.bootstrap()
        }
    }

    /// Fetches promo info after checking the network and updates the shared cache.
    private func fetchAndCachePromoInfo() async throws -> PromotionResponse {
        try self.checkNetworkReachability()
        let info = try await self.licenseService.promoInfo()
        self.promoInfoCache = info
        return info
    }

    #if MAS
    /// Starts the hourly background promo refresh so the shared cache stays warm.
    /// Runs independently of popup opens and user actions.
    private func makePromoInfoRefreshLoop() {
        self.promoInfoRefreshTask?.cancel()
        self.promoInfoRefreshTask = Task { [weak self] in
            while !Task.isCancelled {
                await self?.refreshPromoInfo()
                do {
                    try await Task.sleep(seconds: Constants.promoInfoRefreshInterval)
                } catch {
                    break
                }
            }
        }
    }

    /// Fetches promo info in the background and updates the cache.
    /// On failure the last cached value is kept and the next loop tick retries.
    private func refreshPromoInfo() async {
        do {
            _ = try await self.fetchAndCachePromoInfo()
            LogDebug("Promo info refreshed in background")
        } catch {
            LogError("Failed to refresh promo info: \(error)")
        }
    }
    #endif

    private func makeNetworkStatusLoop() {
        self.networkStatusTask?.cancel()

        self.networkStatusTask = Task { [weak self, eventBus = self.eventBus] in
            let notifications = eventBus.notifications(for: .networkStatusChanged)
            for await note in notifications {
                if let isOnline: Bool = eventBus.parseNotification(note) {
                    await self?.applyNetworkStatus(isOnline)
                } else {
                    LogDebug("Incorrect network status notification format: \(note)")
                }
            }
        }
    }

    private func applyNetworkStatus(_ isOnline: Bool) async {
        guard isOnline else {
            self.checkStatusLoopTask?.cancel()
            return
        }

        self.networkStatusTask?.cancel()

        if self.checkStatusLoopTask?.isCancelled ?? true {
            try? await Task.sleep(seconds: Constants.networkRelaxationTimeout)
            self.makeCheckStatusLoop()
        }
    }

    private func makeCheckStatusLoop() {
        self.checkStatusLoopTask?.cancel()
        self.checkStatusLoopTask = Task { [weak self] in
            guard let self else { return }

            do {
                if await self.netReachability.isAvailable() {
                    try await self.refreshAppStatusInfo()
                } else {
                    LogWarn("Network is not available for app status refresh")
                    await self.checkStatusLoopTask?.cancel()
                    await self.makeNetworkStatusLoop()
                    return
                }
            } catch {
                LogError("Something went wrong on app status refresh loop: \(error)")
            }
            try? await Task.sleep(seconds: Constants.refreshAppStatusInfoInterval)
            guard !Task.isCancelled else {
                LogInfo("Check status loop cancelled")
                return
            }
            await self.makeCheckStatusLoop()
        }
    }

    private func postLicenseUpdateEventIfNeedIt(old: AppStatusInfo?, new: AppStatusInfo?) {
        let statusChanged = old?.isPaid != new?.isPaid

        Task { @MainActor [eventBus = self.eventBus] in
            if statusChanged {
                LogInfo("License status changed: \(old?.licenseStatus.rawValue ?? "none") → \(new?.licenseStatus.rawValue ?? "none")")
                eventBus.post(event: .paidStatusChanged, userInfo: new)
            }

            LogDebug("License info updated for UI")
            eventBus.post(event: .licenseInfoUpdated, userInfo: new)
        }
    }

    private func hasLicenseInfoChanged(old: AppStatusInfo?, new: AppStatusInfo?) -> Bool {
        old?.licenseStatus != new?.licenseStatus
        || old?.expirationDate != new?.expirationDate
        || old?.subscriptionStatus?.nextBillDate != new?.subscriptionStatus?.nextBillDate
        || old?.applicationKey != new?.applicationKey
        || old?.licenseComputersCount != new?.licenseComputersCount
        || old?.licenseMaxComputersCount != new?.licenseMaxComputersCount
        || old?.licenseType != new?.licenseType
        || old?.subscriptionStatus?.status != new?.subscriptionStatus?.status
        || old?.applicationKeyOwner != new?.applicationKeyOwner
        || old?.licenseLifetime != new?.licenseLifetime
        || old?.licenseTrial != new?.licenseTrial
    }

    private func checkNetworkReachability() throws {
        if !self.netReachability.isAvailable() {
            throw BackendServiceError.notConnectedToInternet
        }
    }

    private func fallbackToFreeLicense(with error: Error) async {
        guard self.shouldFallbackToFreeLicense(for: error) else {
            return
        }

        let oldStatusInfo = await self.keychain.getAppStatusInfo()
        LogInfo("Fallback to free license from status: \(oldStatusInfo?.licenseStatus.rawValue ?? "none")")
        await self.keychain.delete(key: .licenseInfo)

        self.postLicenseUpdateEventIfNeedIt(old: oldStatusInfo, new: nil)
    }

    /// Decide if license should be reset based on URLSession error.
    /// - Returns: true = reset license, false = do not reset.
    private func shouldFallbackToFreeLicense(for error: Error) -> Bool {
        if error is CancellationError {
            return false
        }

        switch error {
        case is BackendError, is PayloadError, is DecodingError:
            LogError("Fatal backend error: \(error)")
            return true
        default:
            break
        }

        guard let error = error as? URLError else {
            return false
        }

        switch error.code {
        case .cannotFindHost,
             .dnsLookupFailed,
             .cannotConnectToHost,
             .secureConnectionFailed,
             .serverCertificateUntrusted,
             .serverCertificateHasUnknownRoot,
             .serverCertificateHasBadDate,
             .serverCertificateNotYetValid,
             .timedOut:
            LogError("Fatal backend error: \(error.networkUnavailableReason.map { "\($0)" } ?? "\(error)")")
            return true

        case .notConnectedToInternet,
             .networkConnectionLost,
             .cannotLoadFromNetwork,
             .backgroundSessionWasDisconnected,
             .backgroundSessionInUseByAnotherProcess,
             .dataNotAllowed,
             .internationalRoamingOff,
             .callIsActive:
            return false

        default:
            return false
        }
    }
}
