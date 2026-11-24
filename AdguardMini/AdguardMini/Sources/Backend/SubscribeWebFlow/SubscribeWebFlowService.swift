// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SubscribeWebFlowService.swift
//  AdguardMini
//

import Foundation
import AppKit

import AML
import AppBackend

// MARK: - Constants

private enum Constants {
    static let redirectUrl = "\(MainUrlSchemeActionUrl.subscribeWebFlowRedirect.url)"
}

// MARK: - SubscribeWebFlowService

/// `Sendable` because the implementation holds only immutable collaborators.
protocol SubscribeWebFlowService: Sendable {
    func startPurchaseFlow(from screen: String) async throws
    func startRenewalFlow(licenseKey: String, from screen: String) async throws
}

// MARK: - SubscribeWebFlowServiceImpl

/// `@unchecked Sendable` because the service holds only immutable collaborators.
final class SubscribeWebFlowServiceImpl: @unchecked Sendable {
    private let productInfo: ProductInfoStorage

    init(productInfo: ProductInfoStorage) {
        self.productInfo = productInfo
    }
}

extension SubscribeWebFlowServiceImpl: SubscribeWebFlowService {
    func startPurchaseFlow(from screen: String) async throws {
        let backend = BackendFactory.make(appId: await self.productInfo.applicationId)
        guard let url = backend.purchaseURL(from: screen, returnUrl: Constants.redirectUrl) else {
            throw SubscribeWebFlowServiceError.cantCreateUrl
        }
        NSWorkspace.shared.open(url)
    }

    func startRenewalFlow(licenseKey: String, from screen: String) async throws {
        let backend = BackendFactory.make(appId: await self.productInfo.applicationId)
        guard let url = backend.renewalURL(
            licenseKey: licenseKey,
            from: screen,
            returnUrl: Constants.redirectUrl
        ) else {
            throw SubscribeWebFlowServiceError.cantCreateUrl
        }
        NSWorkspace.shared.open(url)
    }
}
