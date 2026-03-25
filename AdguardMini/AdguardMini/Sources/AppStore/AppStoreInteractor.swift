// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStoreInteractor.swift
//  AdguardMini
//

import AML
import AppBackend
import AppStore
import Foundation
import StoreKit

// MARK: - AppStoreInteractor

protocol AppStoreInteractor {
    func isEligibleForIntroOffer() async -> Bool
    func getAvailableSubscriptions() async throws -> [AppStoreProductInfo]
    func makePurchase(product: AppStore.Subscription) async throws
    func hasActiveEntitlement() async -> Bool
    func restorePurchases() async throws
}

// MARK: - AppStoreInteractorImpl

final class AppStoreInteractorImpl: AppStoreInteractor, StoreApiDelegate {
    private let appStore: StoreApiProtocol
    private let backendService: BackendService

    init(appStore: StoreApiProtocol, backendService: BackendService) {
        self.backendService = backendService
        self.appStore = appStore

        self.appStore.delegate = self
    }

    func isEligibleForIntroOffer() async -> Bool {
        await self.appStore.isEligibleForIntroOffer()
    }

    func getAvailableSubscriptions() async throws -> [AppStoreProductInfo] {
        let result = try await self.appStore.requestProducts()
        var products: [AppStoreProductInfo] = []
        for product in result {
            products.append(await product.toAppStoreProductInfo())
        }
        LogInfo("Available subscriptions: \(products)")
        return products
    }

    func makePurchase(product: AppStore.Subscription) async throws {
        let transaction = try await self.appStore.purchaseProduct(product)
        LogInfo("Purchase \(product.productId) \(!transaction.isNil ? "success" : "pending")")

        guard let transaction
        else { throw AppStoreInteractorError.purchaseNotExists }

        try await self.validateReceipt(jws: transaction.jwsRepresentation)
    }

    func restorePurchases() async throws {
        let transaction = try await self.appStore.restorePurchases()
        LogInfo("Purchases restored")
        try await self.validateReceipt(jws: transaction.jwsRepresentation, restore: true)
    }

    func hasActiveEntitlement() async -> Bool {
        await self.appStore.hasActiveTransaction()
    }

    func transactionUpdated(_ signedTransaction: SignedTransaction, _ err: AppStoreError?) {
        let error = err.map { "\($0)" } ?? "success"
        LogInfo("Purchase \(signedTransaction.productID): \(error)")
        Task {
            do {
                try await self.validateReceipt(jws: signedTransaction.jwsRepresentation)
            } catch {
                LogError("Failed to validate receipt after transaction updated: \(error)")
            }
        }
    }

    private func validateReceipt(jws: String, restore: Bool = false) async throws {
        let info = try await self.backendService.validateReceipt(
            jws: jws,
            restore: restore
        )

        LogInfo("Receipt validated: \(info.applicationKeyStatus)")

        guard info.applicationKeyStatus == .valid else {
            throw AppStoreInteractorError.invalidReceipt(status: "\(info.applicationKeyStatus)")
        }
    }
}
