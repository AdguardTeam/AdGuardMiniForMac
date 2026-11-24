// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebFlowService.swift
//  AdguardMini
//

import Foundation
import AppKit

import AML
import AppBackend

// MARK: - Constants

private enum Constants {
    static let redirectUrl = "\(MainUrlSchemeActionUrl.webFlowRedirect.url)"

    static let webSessionTimeout: TimeInterval = 30.minutes

    static let webSessionErrorDomain = "com.apple.AuthenticationServices.WebAuthenticationSession"
    static let webSessionErrorCancelledCode = 1

    // `nonisolated(unsafe)` because the closure is a write-once constant that captures no state.
    nonisolated(unsafe) static let checkIfUserRedirectedToPurchase: (URLQueryItem) -> Bool = {
        $0.name == "result" && $0.value == "userRedirectedToPurchase"
    }
}

// MARK: - WebFlowService

/// `Sendable` because the implementation holds only immutable collaborators.
protocol WebFlowService: Sendable {
    func activate(from screen: String) async throws -> WebActivateResult
    func activateTrial(from screen: String) async throws -> WebActivateResult
    func bindLicense(licenseKey: String, from screen: String) async throws -> WebActivateResult
    func cancelWebSession()
}

// MARK: - WebFlowServiceImpl

/// `@unchecked Sendable` because every stored property is a `let` collaborator
/// and the service keeps no mutable state of its own.
final class WebFlowServiceImpl: @unchecked Sendable {
    private let productInfo: ProductInfoStorage
    private let webSession: WebSession

    private let presentationContextProvider = PresentationContextProvider()

    init(productInfo: ProductInfoStorage, webSession: WebSession = WebSessionImpl()) {
        self.productInfo = productInfo
        self.webSession = webSession
    }

    @MainActor
    private func startWebSession(url: URL) async throws -> URLComponents {
        try await withCheckedThrowingContinuation { continuation in
            do {
                try self.webSession.start(
                    url: url,
                    callbackURLScheme: BuildConfig.AG_URL_ADGUARD_MINI_SCHEME,
                    timeout: Constants.webSessionTimeout
                ) { result in
                    switch result {
                    case .success(let callbackUrl):
                        if let components = URLComponents(url: callbackUrl, resolvingAgainstBaseURL: true) {
                            continuation.resume(returning: components)
                        } else {
                            LogError("Can't parse url: \(callbackUrl)")
                            continuation.resume(throwing: WebFlowServiceError.cantParseCallbackUrl)
                        }
                    case .failure(let error):
                        continuation.resume(throwing: error)
                    }
                }
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }

    private func processWebSession(url: URL) async throws -> WebActivateResult {
        do {
            let callbackComponents = try await self.startWebSession(url: url)
            if (callbackComponents.queryItems?.contains(where: Constants.checkIfUserRedirectedToPurchase)) ?? false {
                LogInfo("User redirected to purchase")
                return .userRedirectedToPurchase
            }
            return .success
        } catch WebAuthServiceError.other(let error as NSError) {
            if error.domain == Constants.webSessionErrorDomain,
               error.code == Constants.webSessionErrorCancelledCode {
                return .cancelled
            }
            throw WebAuthServiceError.other(error)
        } catch {
            throw error
        }
    }
}

extension WebFlowServiceImpl: WebFlowService {
    func activate(from screen: String) async throws -> WebActivateResult {
        let backend = BackendFactory.make(appId: await self.productInfo.applicationId)
        guard let url = backend.activateURL(from: screen, returnUrl: Constants.redirectUrl) else {
            throw WebFlowServiceError.cantCreateUrl
        }

        return try await self.processWebSession(url: url)
    }

    func activateTrial(from screen: String) async throws -> WebActivateResult {
        let backend = BackendFactory.make(appId: await self.productInfo.applicationId)
        guard let url = backend.trialURL(from: screen, returnUrl: Constants.redirectUrl) else {
            throw WebFlowServiceError.cantCreateUrl
        }

        return try await self.processWebSession(url: url)
    }

    func bindLicense(licenseKey: String, from screen: String) async throws -> WebActivateResult {
        let backend = BackendFactory.make(appId: await self.productInfo.applicationId)
        guard let url = backend.bindURL(licenseKey: licenseKey, from: screen, returnUrl: Constants.redirectUrl) else {
            throw WebFlowServiceError.cantCreateUrl
        }

        return try await self.processWebSession(url: url)
    }

    func cancelWebSession() {
        self.webSession.cancel()
    }
}
