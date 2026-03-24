// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LicenseService.swift
//  AdguardMini
//

import Foundation

import AML
import AppBackend

// MARK: - Constants

private enum Constants {
    static let requestEncryptionKey = SensitiveBuildConfig.SENS_REQUEST_ENCRYPTION_KEY

    #if MAS
    static let appName = "adguard_safari_store"
    #else
    static let appName = "adguard_safari"
    #endif
}

// MARK: - LicenseService

protocol LicenseService {
    func requestAppStatus() async throws -> AppStatusResponse
    func activateApp(appKey: String) async throws -> ActivationResponse
    func validateReceipt(jws: String, restore: Bool) async throws -> ValidateReceiptResponse
    func resetLicense() async throws

    func promoInfo() async throws -> PromotionResponse
}

// MARK: - LicenseServiceImpl

final class LicenseServiceImpl: LicenseService {
    private let networkManager: NetworkManager

    private let systemInfo: SystemInfoManager
    private let productInfo: ProductInfoStorage
    private let sharedSettings: SharedSettingsStorage

    init(
        networkManager: NetworkManager,
        systemInfoManager: SystemInfoManager,
        productInfo: ProductInfoStorage,
        sharedSettings: SharedSettingsStorage
    ) {
        self.networkManager = networkManager
        self.systemInfo = systemInfoManager
        self.productInfo = productInfo
        self.sharedSettings = sharedSettings
    }

    func resetLicense() async throws {
        let request = BackendRequest.resetLicense(applicationId: await self.productInfo.applicationId)

        let response = try await self.networkManager.data(request: request.request)
        try response.check(of: request, action: "resetLicense")
    }

    func requestAppStatus() async throws -> AppStatusResponse {
        let request = try
        BackendRequest.appStatus(
            encryptionKey: Constants.requestEncryptionKey,
            appVersion:    BuildConfig.AG_VERSION,
            appId:         await self.productInfo.applicationId,
            appName:       Constants.appName,
            locale:        Locale.currentLocaleIdentifier,
            sysLocale:     Locale.systemLocaleIdentifier,
            activeProtectionEnabled: self.sharedSettings.protectionEnabled,
            computerName:  self.systemInfo.name,
            mac:           self.systemInfo.mac,
            hid:           self.systemInfo.hid
        )
        return try await self.makeRequest(request, action: "requestAppStatus")
    }

    func activateApp(appKey: String) async throws -> ActivationResponse {
        let request = try
        BackendRequest.activate(
            encryptionKey: Constants.requestEncryptionKey,
            appId:         await self.productInfo.applicationId,
            appKey:        appKey,
            appName:       Constants.appName,
            locale:        Locale.currentLocaleIdentifier
        )
        return try await self.makeRequest(request, action: "activateApp")
    }

    func validateReceipt(jws: String, restore: Bool) async throws -> ValidateReceiptResponse {
        let request = try
        BackendRequest.validateReceipt(
            encryptionKey: Constants.requestEncryptionKey,
            appId: await self.productInfo.applicationId,
            appName: Constants.appName,
            locale: Locale.currentLocaleIdentifier,
            bundleId: BuildConfig.AG_APP_ID,
            signedTransaction: jws,
            restore: restore
        )
        return try await self.makeRequest(request, action: "validateReceipt")
    }

    func promoInfo() async throws -> PromotionResponse {
        let request = try BackendRequest.promotion(
            encryptionKey: Constants.requestEncryptionKey,
            appVersion: BuildConfig.AG_VERSION,
            appId: await self.productInfo.applicationId,
            appName: Constants.appName,
            locale: Locale.currentLocaleIdentifier,
            sysLocale: Locale.systemLocaleIdentifier
        )
        return try await self.makeRequest(request, action: "promoInfo")
    }

    private func makeRequest<T: Decryptable>(
        _ request: BackendRequest,
        retry: Bool = false,
        action: String
    ) async throws -> T {
        do {
            let response = try await self.networkManager.data(request: request.request)
            try response.check(of: request, action: action)
            return try T(encryptedData: response.data, decryptionKey: Constants.requestEncryptionKey)
        } catch {
            LogError("Failed for \(action): \(error)")
            throw error
        }
    }
}

private extension Locale {
    static var currentLocaleIdentifier: String {
        Self.identifier(for: .current)
    }

    static var systemLocaleIdentifier: String {
        Self.identifier(for: .autoupdatingCurrent)
    }

    private static func identifier(for locale: Locale) -> String {
        locale.collatorIdentifier ?? locale.identifier
    }
}
