// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStateAssembler.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - URLFilterStateAssembler

/// Assembles the pure Swift ``URLFilterUIState`` from the platform
/// ``URLFilterService``, the persisted protection level, and the shared
/// bloom metadata.
///
/// An `actor` so that state assembly is serialized; it owns the transient
/// `installRequested` flag that backs ``URLFilterInfo/isInstalling``.
actor URLFilterStateAssembler {
    private let urlFilterService: URLFilterService
    private let protectionLevelProvider: @Sendable () -> URLFilterProtectionLevel
    private let isNewProvider: @Sendable () -> Bool
    private let isPageNewProvider: @Sendable () -> Bool
    private let bloomMetadataProvider: @Sendable () -> URLFilterBloomMetadata?
    private var installRequested = false

    /// Creates the assembler.
    /// - Parameters:
    ///   - urlFilterService: Platform URL filter service (status + configuration).
    ///   - protectionLevelProvider: Reads the persisted protection level.
    ///   - isNewProvider: Reads the "settings card is new" flag.
    ///   - isPageNewProvider: Reads the "settings page is new" flag.
    ///   - bloomMetadataProvider: Reads the persisted bloom metadata, if any.
    init(
        urlFilterService: URLFilterService,
        protectionLevelProvider: @escaping @Sendable () -> URLFilterProtectionLevel,
        isNewProvider: @escaping @Sendable () -> Bool,
        isPageNewProvider: @escaping @Sendable () -> Bool,
        bloomMetadataProvider: @escaping @Sendable () -> URLFilterBloomMetadata?
    ) {
        self.urlFilterService = urlFilterService
        self.protectionLevelProvider = protectionLevelProvider
        self.isNewProvider = isNewProvider
        self.isPageNewProvider = isPageNewProvider
        self.bloomMetadataProvider = bloomMetadataProvider
    }

    /// Records that a first-time installation was requested.
    ///
    /// Reflected in ``URLFilterInfo/isInstalling`` while the status is
    /// `.starting`. Once the status leaves `.starting`, the flag is cleared:
    /// `.running` means the install succeeded, `.invalid` / `.stopped` mean
    /// it failed (observable through the status itself), and `.disabled`
    /// means the user turned protection off on purpose.
    func markInstallRequested() {
        self.installRequested = true
    }

    /// Clears the install-requested flag after the configuration was removed.
    ///
    /// Bloom metadata is intentionally kept (it may still describe the last
    /// installed prefilter); only the in-memory flag is cleared.
    func markConfigurationRemoved() {
        self.installRequested = false
    }

    /// Builds the current aggregate state.
    func makeState() async -> URLFilterUIState {
        let status = await self.urlFilterService.getStatus()
        let configuration = await self.loadConfiguration()

        let isStarting = status == .starting
        if !isStarting {
            self.installRequested = false
        }
        let isInstalling = self.installRequested && isStarting

        // Re-read the metadata on every assembly: it is written by the
        // URL filter extension process and may appear at any time.
        let bloomMetadata = self.bloomMetadataProvider()

        return URLFilterUIState(
            status: status,
            enabled: configuration?.enabled ?? false,
            protectionLevel: self.protectionLevelProvider(),
            isNew: self.isNewProvider(),
            isPageNew: self.isPageNewProvider(),
            info: URLFilterInfo(
                rulesCount: bloomMetadata?.rulesCount,
                lastUpdate: bloomMetadata?.timeUpdated,
                isInstalling: isInstalling
            ),
            errorMessage: status.errorMessage
        )
    }

    /// Loads the platform configuration, logging failures instead of swallowing them.
    ///
    /// A failing load is a real problem (for example the extension lost its
    /// configuration) and would otherwise be invisible in the logs. The
    /// `unsupportedPlatform` and `configurationMissing` cases are expected:
    /// macOS without system-wide filtering, or before the first-time setup,
    /// so they are not logged as errors.
    private func loadConfiguration() async -> URLFilterConfiguration? {
        do {
            return try await self.urlFilterService.loadConfiguration()
        } catch URLFilterServiceError.unsupportedPlatform,
                URLFilterServiceError.configurationMissing {
            return nil
        } catch {
            LogError("URLFilter loadConfiguration failed: \(error)")
            return nil
        }
    }
}
