// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ProductInfo.swift
//  AdguardMini
//

import Foundation
import CryptoKit

import AML

private enum Constants {
    #if MAS
    static let appIdMasPrefix = "mas"
    #endif
}

enum ProductInfo {
    /// Returns string that represents User-Agent HTTP Header.
    static let userAgentString: String = {
        let version = ProcessInfo.processInfo.operatingSystemVersion
        return "\(BuildConfig.AG_PRODUCT_NAME)/\(BuildConfig.AG_FULL_VERSION) (Macintosh; Intel Mac OS X \(version.majorVersion)_\(version.minorVersion)_\(version.patchVersion))"
    }()

    static func applicationId() async -> String {
        await Task.detached(priority: .userInitiated) {
            Self.applicationId()
        }.value
    }

    /// Returns the unique application identifier.
    ///
    /// - Returns: A string containing the application ID.
    ///            - For Mac App Store builds: Returns the ID prefixed with "mas"
    ///            - For standalone builds: Returns the raw application ID
    ///
    /// The ID is generated once and stored persistently. To regenerate the ID,
    /// use `overrideApplicationId(_:)` with a new value.
    ///
    /// - Note: The ID is stable across application launches on the same system.
    static func applicationId() -> String {
        let storedAppId: String? = Keychain.getValueShared(for: KeychainKey.Base.applicationId.key)
        let appId = storedAppId ?? self.generateApplicationId()
        if storedAppId.isNil {
            Self.overrideApplicationId(appId)
        }
        #if MAS
        return "\(Constants.appIdMasPrefix)\(appId)"
        #else
        return appId
        #endif
    }

    static func overrideApplicationId(_ appId: String) {
        Keychain.setShared(key: .applicationId, value: appId)
    }

    /// Generates a unique application identifier based on system information.
    ///
    /// This method creates a stable, unique identifier for the application by hashing system-specific information.
    /// If system information is not available, it falls back to a randomly generated UUID.
    ///
    /// - Returns: A 32-character lowercase hex string (0-9, a-f) representing the application ID.
    ///            Generated from SHA-256 hash of system's MAC address or fallback random UUID.
    ///
    /// - Note: The generated ID is stable across application launches on the same system
    ///         but will be different across different systems.
    private static func generateApplicationId() -> String {
        let fallbackAppIdData = UUID().uuidString.replacingOccurrences(of: "-", with: "").data(using: .utf8)!
        let data = SystemInfo.mac?.data(using: .utf8) ?? fallbackAppIdData
        let hashed = SHA256.hash(data: data)

        // Take first 16 bytes (half of SHA256) of the hash. Backend needs short ids
        return hashed.prefix(16).compactMap { String(format: "%02x", $0) }.joined()
    }

    static let releaseVariant: ReleaseVariant = {
#if MAS
        .MAS
#else
        .standalone
#endif
    }()
}
