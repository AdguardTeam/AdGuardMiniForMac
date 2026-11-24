// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  NetworkManager.swift
//  AdguardMini
//

import Foundation

import AML
import AppBackend

// MARK: - Constants

private enum Constants {
    static var cacheDir: URL? {
        URL(string: NSTemporaryDirectory().appendingPathComponent("NetworkingCache"))
    }
    static var configuration: URLSessionConfiguration {
        let config = URLSessionConfiguration.default

        let cacheDir = Self.cacheDir
        LogDebug("URLSession cache directory: \(cacheDir?.debugDescription ?? "nil")")

        let cache = URLCache(
            memoryCapacity: 16_384,
            diskCapacity: 10_000_000,
            directory: cacheDir
        )

        config.urlCache = cache
        config.requestCachePolicy = .useProtocolCachePolicy

        return config
    }
}

// MARK: - NetworkManagerProtocol

/// `Sendable` because the implementation is stateless over `URLSession`.
protocol NetworkManager: AnyObject, Sendable {
    func data(request: HTTPRequest) async throws -> HTTPResponse
    func data(request: URLRequest) async throws -> HTTPResponse
}

// MARK: - NetworkManager

/// `@unchecked Sendable` because the manager is stateless over `URLSession`.
final class NetworkManagerImpl: NetworkManager, @unchecked Sendable {
    // MARK: Private properties

    private let session = URLSession(configuration: Constants.configuration)

    // MARK: Public methods

    func data(request: HTTPRequest) async throws -> HTTPResponse {
        let urlRequest = request.toURLRequest()
        return try await self.data(request: urlRequest)
    }

    func data(request: URLRequest) async throws -> HTTPResponse {
        do {
            let (data, response) = try await self.session.data(for: request)
            return HTTPResponse(urlResponse: response, data: data)
        } catch {
            LogError("Network request failed: \(error)")
            throw error
        }
    }
}
