// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AccountServiceImpl.swift
//  AdguardMini
//

import Foundation
import StoreKit

import AML
import AppStore
import SciterSchema

// MARK: - Constants

private enum Constants {
    // Fallback is false due to backend implementation
    static let defaultTrialAvailability: Bool = false

    static let defaultScreenName = "account"
    static var appStoreLink: URL {
        URL(string: "macappstore://apps.apple.com/app/id1440147259")!
    }

    static var appStoreReviewLink: URL {
        URL(string: "macappstore://apps.apple.com/app/id1440147259?action=write-review")!
    }

    static var appStoreSubscriptionsLink: URL {
        URL(string: "macappstore://apps.apple.com/account/subscriptions")!
    }
}

// MARK: - Sciter.AccountServiceImpl dependencies

extension Sciter.AccountServiceImpl:
    BackendServiceDependent,
    LicenseStateProviderDependent,
    AppActivationObserverDependent {}

#if MAS
extension Sciter.AccountServiceImpl: AppStoreInteractorDependent {}
#endif

// MARK: - Sciter.AccountServiceImpl implementation

extension Sciter {
    final class AccountServiceImpl: SciterSchema.AccountService.ServiceType {
        var backendService: BackendService!
        var licenseStateProvider: LicenseStateProvider!
        var appActivationObserver: AppActivationObserver!

        #if MAS
        var appStoreInteractor: AppStoreInteractor!
        #endif

        override init() {
            super.init()
            self.setupServices()
        }

        func getLicense(_ message: EmptyValue, _ promise: @escaping (LicenseOrError) -> Void) {
            Task {
                let licenseInfo = await self.backendService.getStoredAppStatusInfo()
                let canReset = await self.licenseStateProvider.canReset(for: licenseInfo)
                promise(licenseInfo?.toProto(canReset: canReset) ?? .licenseError)
            }
        }

        func refreshLicense(_ message: EmptyValue, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                do {
                    try await self.backendService.refreshAppStatusInfo()
                    promise(OptionalError(hasError: false))
                } catch {
                    let message = "Error refreshing app status: \(error)"
                    LogError(message)
                    promise(OptionalError(hasError: true, message: message))
                }
            }
        }

        func getSubscriptionsInfo(_ message: EmptyValue, _ promise: @escaping (AppStoreSubscriptionsMessage) -> Void) {
            #if MAS
            Task {
                do {
                    let products = try await self.appStoreInteractor.getAvailableSubscriptions()
                    let trialInfo = products.contains { $0.isEligibleForIntroOffer }
                    var promoInfo: SciterSchema.PromoInfo?
                    do {
                        let info = try await self.backendService.promoInfo()
                        if info.isActual {
                            promoInfo = PromoInfo(
                                title: info.title,
                                subtitle: info.label
                            )
                        }
                    } catch {
                        LogError("Error fetching promo info: \(error)")
                    }
                    promise(
                        AppStoreSubscriptionsMessage(
                            result: AppStoreSubscriptions(
                                isTrialAvailable: trialInfo,
                                monthly: self.getSubscriptionInfo(.monthly, products: products),
                                annual: self.getSubscriptionInfo(.annual, products: products),
                                promoInfo: promoInfo
                            )
                        )
                    )
                } catch {
                    LogError("Request products error: \(error)")
                    promise(AppStoreSubscriptionsMessage(error: self.processAppStoreError(error)))
                }
            }
            #else
            Task {
                let trialInfo = await self.backendService.trialInfo
                promise(
                    AppStoreSubscriptionsMessage(
                        result: AppStoreSubscriptions(
                            isTrialAvailable: trialInfo?.isAvailable ?? Constants.defaultTrialAvailability,
                            monthly: .init(),
                            annual: .init()
                        )
                    )
                )
            }
            promise(AppStoreSubscriptionsMessage(error: .unknown))
            #endif
        }

        func getTrialAvailableDays(_ message: EmptyValue, _ promise: @escaping (Int32Value) -> Void) {
            Task {
                #if MAS
                var isTrialAvailable: Bool = false
                var availableDays: Int32 = 0
                do {
                    let products = try await self.appStoreInteractor.getAvailableSubscriptions()
                    for product in products {
                        isTrialAvailable = product.isEligibleForIntroOffer
                                           && product.introductoryOffer?.paymentMode == .freeTrial
                        if isTrialAvailable {
                            availableDays = Int32(product.introductoryOffer?.period.value ?? 0)
                            break
                        }
                    }
                } catch {
                    LogError("Failed to get available subscriptions: \(error)")
                }
                #else
                let trialInfo = await backendService.trialInfo
                let isTrialAvailable = trialInfo?.isAvailable ?? Constants.defaultTrialAvailability
                let availableDays: Int32 = isTrialAvailable ? Int32(trialInfo?.durationDays ?? 0) : 0
                #endif
                promise(Int32Value(availableDays))
            }
        }

        func requestActivate(_ message: EmptyValue, _ promise: @escaping (WebActivateResultMessage) -> Void) {
            Task {
                await self.startWebFlow(
                    from: Constants.defaultScreenName,
                    action: self.backendService.webActivateApp,
                    promise: promise
                )
            }
        }

        func requestBind(_ message: StringValue, _ promise: @escaping (WebActivateResultMessage) -> Void) {
            // Throwing closure is not part of task on this case
            // swiftlint:disable:next unhandled_throwing_task
            Task {
                await self.startWebFlow(
                    from: Constants.defaultScreenName,
                    action: { try await self.backendService.webBindKeyToOwner(licenseKey: message.value, from: $0) },
                    promise: promise
                )
            }
        }

        func requestRenew(
            _ message: StringValue,
            _ promise: @escaping (OptionalError) -> Void
        ) {
            Task {
                do {
                    self.appActivationObserver.startObserving()
                    try await self.backendService.startRenewalFlow(
                        licenseKey: message.value,
                        from: Constants.defaultScreenName
                    )
                    promise(OptionalError(hasError: false))
                } catch {
                    self.appActivationObserver.stopObserving()
                    let message = "Purchase error: \(error)"
                    LogError(message)
                    promise(OptionalError(hasError: true, message: message))
                }
            }
        }

        func requestLogout(_ message: EmptyValue, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                do {
                    try await self.backendService.logout()
                    promise(OptionalError(hasError: false))
                } catch {
                    LogError("Can't logout: \(error)")
                    promise(OptionalError(hasError: true))
                }
            }
        }

        func requestSubscribe(_ message: SubscriptionMessage, _ promise: @escaping (OptionalError) -> Void) {
            Task {
                LogInfo("Request subscribe: \(message.info)")
                await self.makeSubscribe(message, promise)
            }
        }

        func enterActivationCode(
            _ message: StringValue,
            _ promise: @escaping (EnterActivationCodeResultMessage) -> Void
        ) {
            Task {
                do {
                    let result = try await self.backendService.activateApp(appKey: message.value)
                    promise(EnterActivationCodeResultMessage(result: result.toProto()))
                } catch {
                    LogError("Can't activate app: \(error)")
                    promise(EnterActivationCodeResultMessage(error: OptionalError(hasError: true, message: "\(error)")))
                }
            }
        }

        func requestRestorePurchases(_ message: EmptyValue, _ promise: @escaping (OptionalError) -> Void) {
            #if MAS
            Task {
                do {
                    try await self.appStoreInteractor.restorePurchases()
                    LogInfo("Purchases restored successfully")
                    promise(OptionalError(hasError: false))
                } catch {
                    let message = "Error restore purchases: \(error)"
                    LogError(message)
                    promise(OptionalError(hasError: true, message: message))
                }
            }
            #else
            promise(OptionalError(hasError: true, message: "Restore purchases not supported"))
            #endif
        }

        #if MAS
        private func makeAppStoreSubscribe(
            _ subscription: SubscriptionMessage,
            _ promise: @escaping (OptionalError) -> Void
        ) async {
            let subscription: AppStore.Subscription = subscription.toAppStoreSubscription()
            do {
                try await self.appStoreInteractor.makePurchase(product: subscription)
                LogInfo("\(subscription) purchased")
                promise(OptionalError(hasError: false))
            } catch {
                let message = "Purchase error: \(error)"
                LogError(message)
                promise(OptionalError(hasError: true, message: message))
            }
        }
        #endif

        private func makeSubscribe(
            _ subscription: SubscriptionMessage,
            _ promise: @escaping (OptionalError) -> Void
        ) async {
            do {
                switch subscription.subscriptionType {
                case .trial:
                    self.appActivationObserver.startObserving()
                    defer {
                        self.appActivationObserver.stopObserving()
                    }
                    let result = try await self.backendService.webRequestTrial(from: Constants.defaultScreenName)
                    if result == .userRedirectedToPurchase {
                        self.appActivationObserver.activatePrevApp()
                    }
                    promise(OptionalError())
                    self.appActivationObserver.stopObserving()
                #if MAS
                case .annual, .monthly:
                    await self.makeAppStoreSubscribe(subscription, promise)
                #endif
                default:
                    try await self.backendService.startPurchaseFlow(from: Constants.defaultScreenName)
                    promise(OptionalError())
                }
            } catch {
                let message = "Purchase error: \(error)"
                LogError(message)
                promise(.error(message))
            }
        }

        private func startWebFlow(
            function: String = #function,
            line: UInt = #line,
            from screen: String,
            action: (_ screen: String) async throws -> WebActivateResult
        ) async -> Result<WebActivateResult, Error> {
            self.appActivationObserver.startObserving()
            defer {
                self.appActivationObserver.stopObserving()
            }

            do {
                let result = try await action(screen)
                if result == .userRedirectedToPurchase {
                    self.appActivationObserver.activatePrevApp()
                }
                return .success(result)
            } catch {
                LogError("WebFlow error: \(error)", function: function, line: line)
                return .failure(error)
            }
        }

        private func startWebFlow(
            function: String = #function,
            line: UInt = #line,
            from screen: String,
            action: (_ screen: String) async throws -> WebActivateResult,
            promise: @escaping (WebActivateResultMessage) -> Void
        ) async {
            let result = await self.startWebFlow(function: function, line: line, from: screen, action: action)
            switch result {
            case .success(let activateResult):
                promise(
                    WebActivateResultMessage(
                        result: activateResult.toProto(),
                        error: OptionalError(hasError: false)
                    )
                )
            case .failure(let error):
                promise(WebActivateResultMessage(error: OptionalError(hasError: true, message: "\(error)")))
            }
        }

        private func processAppStoreError(_ error: Error) -> AppStoreSubscriptionsError {
            guard let appStoreError = error as? AppStoreError else {
                return .otherError
            }

            return switch appStoreError {
            case .productUnavailable: .productsBanned
            default:                  .otherError
            }
        }

        func requestOpenSubscriptions(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            NSWorkspace.shared.open(Constants.appStoreSubscriptionsLink)
            promise(EmptyValue())
        }

        func requestOpenAppStore(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            NSWorkspace.shared.open(Constants.appStoreLink)
            promise(EmptyValue())
        }

        func requestOpenAppStoreReview(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
            NSWorkspace.shared.open(Constants.appStoreReviewLink)
            promise(EmptyValue())
        }
    }
}

private extension Sciter.AccountServiceImpl {
    func getSubscriptionInfo(
        _ productId: AppStore.Subscription,
        products: [AppStoreProductInfo]
    ) -> AppStoreSubscriptionInfo {
        if let productInfo = products.first(where: { $0.productId == productId.rawValue }) {
            return productInfo.toProto()
        }
        return AppStoreSubscriptionInfo()
    }
}

private extension SubscriptionMessage {
    func toAppStoreSubscription() -> AppStore.Subscription {
        let unexpectedHandler: (Int, String) -> AppStore.Subscription = { rawValue, message in
            LogError("\(message) subscription type: \(rawValue). Switch to annual")
            return .annual
        }

        // Improve readability
        // swiftlint:disable switch_case_on_newline
        return switch self.subscriptionType {
        case .annual:                  .annual
        case .monthly:                 .monthly
        case .standalone, .trial:      unexpectedHandler(self.subscriptionType.rawValue, "Unexpected")
        case .UNRECOGNIZED(let value): unexpectedHandler(value, "Unrecognised")
        }
        // swiftlint:enable switch_case_on_newline
    }

    var info: String {
        switch self.subscriptionType {
        case .annual:                  "Annual"
        case .monthly:                 "Monthly"
        case .standalone:              "Standalone"
        case .trial:                   "Trial"
        case .UNRECOGNIZED(let value): "Unrecognised(\(value))"
        }
    }
}
