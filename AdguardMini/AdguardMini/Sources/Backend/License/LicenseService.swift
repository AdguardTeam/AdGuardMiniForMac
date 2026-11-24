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
}

// MARK: - LicenseService

/// `Sendable` because the implementation holds only immutable collaborators.
protocol LicenseService: Sendable {
    func requestAppStatus() async throws -> AppStatusResponse
    func activateApp(appKey: String) async throws -> ActivationResponse
    func validateReceipt(jws: String, restore: Bool) async throws -> ActivationResponse
    func resetLicense() async throws

    func promoInfo() async throws -> PromotionResponse
}

// MARK: - LicenseServiceImpl

/// `@unchecked Sendable` because every stored property is an immutable
/// collaborator.
final class LicenseServiceImpl: LicenseService, @unchecked Sendable {
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

    private var backend: AppBackend.Backend {
        get async {
            BackendFactory.make(appId: await self.productInfo.applicationId)
        }
    }

    func resetLicense() async throws {
        let backend = await self.backend
        let request = backend.resetLicense()

        let response = try await self.networkManager.data(request: request.request)
        try response.check(of: request, action: "resetLicense")
    }

    func requestAppStatus() async throws -> AppStatusResponse {
        let backend = await self.backend
        let request = try
        backend.appStatus(
            encryptionKey: Constants.requestEncryptionKey,
            parameters: Backend.AppStatusParameters(
                locale:        Locale.currentLocaleIdentifier,
                sysLocale:     Locale.systemLocaleIdentifier,
                activeProtectionEnabled: self.sharedSettings.protectionEnabled,
                computerName:  self.systemInfo.name,
                mac:           self.systemInfo.mac,
                hid:           self.systemInfo.hid
            )
        )
        return try await self.makeRequest(request, action: "requestAppStatus")
    }

    func activateApp(appKey: String) async throws -> ActivationResponse {
        let backend = await self.backend
        let request = try
        backend.activate(
            encryptionKey: Constants.requestEncryptionKey,
            appKey:        appKey,
            locale:        Locale.currentLocaleIdentifier
        )
        return try await self.makeRequest(request, action: "activateApp")
    }

    func validateReceipt(jws: String, restore: Bool) async throws -> ActivationResponse {
        let backend = await self.backend
        let request = try
        backend.validateReceipt(
            encryptionKey: Constants.requestEncryptionKey,
            locale: Locale.currentLocaleIdentifier,
            bundleId: BuildConfig.AG_APP_ID,
            signedTransaction: jws,
            restore: restore
        )
        return try await self.makeRequest(request, action: "validateReceipt")
    }

    func promoInfo() async throws -> PromotionResponse {
        let backend = await self.backend
        let request = try backend.promotion(
            encryptionKey: Constants.requestEncryptionKey,
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
