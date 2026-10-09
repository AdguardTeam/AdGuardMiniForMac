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
    private let bloomMetadataProvider: @Sendable () -> URLFilterBloomMetadata?
    private let iCloudDomainBlockageChecker: ICloudDomainBlockageChecking

    /// Creates the assembler.
    /// - Parameters:
    ///   - urlFilterService: Platform URL filter service (status + configuration).
    ///   - protectionLevelProvider: Reads the persisted protection level.
    ///   - isNewProvider: Reads the "settings card is new" flag.
    ///   - bloomMetadataProvider: Reads the persisted bloom metadata, if any.
    ///   - iCloudDomainBlockageChecker: Classifies a failed filter as the iCloud error.
    init(
        urlFilterService: URLFilterService,
        protectionLevelProvider: @escaping @Sendable () -> URLFilterProtectionLevel,
        isNewProvider: @escaping @Sendable () -> Bool,
        bloomMetadataProvider: @escaping @Sendable () -> URLFilterBloomMetadata?,
        iCloudDomainBlockageChecker: ICloudDomainBlockageChecking
    ) {
        self.urlFilterService = urlFilterService
        self.protectionLevelProvider = protectionLevelProvider
        self.isNewProvider = isNewProvider
        self.bloomMetadataProvider = bloomMetadataProvider
        self.iCloudDomainBlockageChecker = iCloudDomainBlockageChecker
    }

    /// Builds the current aggregate state.
    func makeState() async -> URLFilterUIState {
        guard let state = try? await self.urlFilterService.getState() else {
            return .error
        }
        // Re-read the metadata on every assembly: it is written by the
        // URL filter extension process and may appear at any time.
        let bloomMetadata = self.bloomMetadataProvider()

        // A filter reports `.invalid` while disabled or mid-bring-up.
        // Only surface an error when enabled with a recorded failure.
        var status: URLFilterUIStatus = switch state.status {
        case .invalid, .unknown:   (state.enabled && state.lastDisconnectError != nil) ? .error : .loading
        case .stopped:             (state.enabled && state.lastDisconnectError != nil) ? .error : .loading
        case .starting, .stopping: .loading
        case .running:             .running
        }

        // Only a server-setup failure can be caused by blocked iCloud hosts.
        if status == .error,
           state.lastDisconnectError == .serverSetupIncomplete,
           await self.iCloudDomainBlockageChecker.isAnyDomainBlocked() {
            status = .dnsError
        }

        let isEnabled = state.enabled && !status.isError

        return URLFilterUIState(
            enabled: isEnabled,
            status: status,
            protectionLevel: self.protectionLevelProvider(),
            isInstalled: state.serverURL != nil && state.issuerURL != nil,
            info: URLFilterInfo(
                rulesCount: bloomMetadata?.rulesCount,
                lastUpdate: bloomMetadata?.timeUpdated
            )
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
