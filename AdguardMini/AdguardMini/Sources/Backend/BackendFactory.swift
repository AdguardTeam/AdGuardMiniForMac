// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  BackendFactory.swift
//  AdguardMini
//

import Foundation

import AML
import AppBackend

/// Builds the `AppBackend.Backend` configuration for the current build.
///
/// The application identifier is read asynchronously from the keychain, so
/// `appId` must be supplied by the caller.
enum BackendFactory {
    // Safe to reuse: `appId` and the build-time values are fixed, and nothing calls `DeveloperConfigUtils.reload()`.
    nonisolated(unsafe) private static var cached: (appId: String, backend: AppBackend.Backend)?
    // `nonisolated(unsafe)` because every access to the cache goes through this lock.
    nonisolated(unsafe) private static let lock = UnfairLock()

    /// Creates a backend configured for this build.
    /// - Parameter appId: The application identifier.
    /// - Returns: A backend instance configured for this build.
    static func make(appId: String) -> AppBackend.Backend {
        locked(self.lock) {
            if let cached = self.cached, cached.appId == appId {
                return cached.backend
            }

            let backend = self.build(appId: appId)
            self.cached = (appId: appId, backend: backend)
            return backend
        }
    }

    /// Builds a backend configuration from the app id and the build-time values.
    private static func build(appId: String) -> AppBackend.Backend {
        Backend(
            configuration: Backend.Configuration(
                responseValidationKey: SensitiveBuildConfig.SENS_BACKEND_REQUEST_KEY,
                userAgent: ProductInfo.userAgentString,
                app: Backend.App.macMini(
                    id: appId,
                    type: Self.appType,
                    appVersion: BuildConfig.AG_VERSION,
                    versionTitle: BuildConfig.AG_VERSION_TITLE
                ),
                baseURLs: Self.makeBaseURLs()
            )
        )
    }

    private static let appType: Backend.AppType = {
        #if MAS
        .store
        #else
        .standalone
        #endif
    }()

    /// Creates the base URLs for this build, with developer host overrides applied.
    private static func makeBaseURLs() -> Backend.BaseURLs {
        #if DEBUG
        let preset = Backend.BaseURLs.development
        #else
        let preset = Backend.BaseURLs.production
        #endif

        return Backend.BaseURLs(
            backendAPI: Self.overrideURL(for: .backendApiUrl) ?? preset.backendAPI,
            web: Self.overrideURL(for: .webApiUrl) ?? preset.web,
            subscribe: Self.overrideURL(for: .subscribeApiUrl) ?? preset.subscribe,
            reports: Self.overrideURL(for: .reportsApiUrl) ?? preset.reports
        )
    }

    /// Returns the developer config override for a URL property.
    private static func overrideURL(for property: DeveloperConfigUtils.Property) -> URL? {
        guard let value = DeveloperConfigUtils[property] as? String else {
            return nil
        }
        return URL(string: value)
    }
}
