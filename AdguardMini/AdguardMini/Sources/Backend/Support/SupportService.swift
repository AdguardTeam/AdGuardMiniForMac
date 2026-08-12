// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SupportService.swift
//  AdguardMini
//

import Foundation

import AML
import AppBackend

// MARK: - SupportService

protocol SupportService {
    func sendFeedbackMessage(
        email: String,
        subject: String,
        description: String,
        attachments: RequestFileEntities
    ) async throws
}

// MARK: - SupportServiceImpl

final class SupportServiceImpl: SupportService {
    private let networkManager: NetworkManager
    private let productInfo: ProductInfoStorage

    init(
        networkManager: NetworkManager,
        productInfo: ProductInfoStorage
    ) {
        self.networkManager = networkManager
        self.productInfo = productInfo
    }

    func sendFeedbackMessage(
        email: String,
        subject: String,
        description: String,
        attachments: RequestFileEntities
    ) async throws {
        let request = BackendRequest.supportFeedback(
            applicationId: await self.productInfo.applicationId,
            version: BuildConfig.AG_VERSION_TITLE,
            email: email,
            language: Locale.current.languageCode ?? "en",
            subject: subject,
            description: description,
            attachments: attachments
        )

        let response = try await self.networkManager.data(request: request.request)

        try response.check(of: request, action: "Send feedback")
    }
}
