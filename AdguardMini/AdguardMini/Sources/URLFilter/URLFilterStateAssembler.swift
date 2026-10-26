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
    private let bloomMetadataProvider: @Sendable () -> URLFilterBloomMetadata?
    private let iCloudDomainBlockageChecker: ICloudDomainBlockageChecking
    private let userIntentProvider: @Sendable () -> Bool

    /// Creates the assembler.
    /// - Parameters:
    ///   - urlFilterService: Platform URL filter service (status + configuration).
    ///   - protectionLevelProvider: Reads the persisted protection level.
    ///   - bloomMetadataProvider: Reads the persisted bloom metadata, if any.
    ///   - userIntentProvider: Reads the user's persisted choice to keep the filter on.
    ///   - iCloudDomainBlockageChecker: Classifies a failed filter as the iCloud error.
    init(
        urlFilterService: URLFilterService,
        protectionLevelProvider: @escaping @Sendable () -> URLFilterProtectionLevel,
        bloomMetadataProvider: @escaping @Sendable () -> URLFilterBloomMetadata?,
        userIntentProvider: @escaping @Sendable () -> Bool,
        iCloudDomainBlockageChecker: ICloudDomainBlockageChecking
    ) {
        self.urlFilterService = urlFilterService
        self.protectionLevelProvider = protectionLevelProvider
        self.bloomMetadataProvider = bloomMetadataProvider
        self.iCloudDomainBlockageChecker = iCloudDomainBlockageChecker
        self.userIntentProvider = userIntentProvider
    }

    /// Builds the current aggregate state.
    func makeState() async -> URLFilterUIState {
        guard let state = try? await self.urlFilterService.getState() else {
            return .error
        }
        // Re-read the metadata on every assembly: it is written by the
        // URL filter extension process and may appear at any time.
        let bloomMetadata = self.bloomMetadataProvider()
        let userIntentEnabled = self.userIntentProvider()

        // A filter reports `.invalid` while disabled or mid-bring-up.
        // A recorded failure surfaces while the user wants the filter on, fail-safe disable included.
        let hasFailure = userIntentEnabled && state.lastDisconnectError != nil
        var status: URLFilterUIStatus = switch state.status {
        case .invalid, .unknown:   hasFailure ? .error : .loading
        case .stopped:             hasFailure ? .error : .loading
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
            isInstalled: state.isInstalled,
            userIntentEnabled: userIntentEnabled,
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
