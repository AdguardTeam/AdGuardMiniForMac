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
        attachments: [RequestFileEntity]
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
        attachments: [RequestFileEntity]
    ) async throws {
        let backend = BackendFactory.make(appId: await self.productInfo.applicationId)
        let request = backend.supportFeedback(
            email: email,
            language: Locale.current.language.languageCode?.identifier ?? "en",
            subject: subject,
            description: description,
            attachments: attachments
        )

        let response = try await self.networkManager.data(request: request.request)

        try response.check(of: request, action: "Send feedback")
    }
}
