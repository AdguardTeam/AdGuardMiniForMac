// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterResetService.swift
//  AdguardMini
//

import Foundation
import AML

/// Encapsulates the complete URL filtering state reset.
///
/// Removes the platform configuration (treated as a no-op on macOS versions
/// without system-wide URL filtering), clears the keychain data, and
/// removes the bloom metadata together with the persisted prefilter file.
/// Also notifies `URLFilterStateAssembler` that the configuration was
/// removed, so the next assembled state does not reuse stale flags.
///
/// Used as the single reset entry point by app-level reset flows.
protocol URLFilterResetService: AnyObject {
    /// Resets all URL filtering state.
    ///
    /// The local cleanup (keychain, bloom metadata, prefilter file) runs even
    /// if the platform configuration removal fails, so a partially failed
    /// reset never leaves stale local state behind.
    ///
    /// - Returns: `nil` on success, or the configuration removal error.
    func reset() async -> Error?
}

// MARK: - URLFilterResetServiceImpl

/// Default `URLFilterResetService` implementation.
///
/// Delegates the platform removal to `URLFilterService` and the keychain
/// cleanup to `SharedKeychainStorage`, keeping the bloom metadata and the
/// prefilter file cleanup local.
final class URLFilterResetServiceImpl: URLFilterResetService {
    // MARK: Private properties

    private let urlFilterService: URLFilterService
    private let sharedKeychainStorage: SharedKeychainStorage
    private let bloomMetadataStorage: URLFilterBloomMetadataStorage
    private let groupFolderFileService: GroupFolderFileService
    private let urlFilterStateAssembler: URLFilterStateAssembler

    // MARK: Init

    init(
        _ urlFilterService: URLFilterService,
        _ sharedKeychainStorage: SharedKeychainStorage,
        _ bloomMetadataStorage: URLFilterBloomMetadataStorage,
        _ groupFolderFileService: GroupFolderFileService,
        _ urlFilterStateAssembler: URLFilterStateAssembler
    ) {
        self.urlFilterService = urlFilterService
        self.sharedKeychainStorage = sharedKeychainStorage
        self.bloomMetadataStorage = bloomMetadataStorage
        self.groupFolderFileService = groupFolderFileService
        self.urlFilterStateAssembler = urlFilterStateAssembler
    }

    // MARK: Public methods

    func reset() async -> Error? {
        var resetError: Error?
        do {
            try await self.urlFilterService.removeConfiguration()
        } catch URLFilterServiceError.unsupportedPlatform {
            // URL filtering is unavailable on this macOS version
            LogDebug("URLFilter reset skipped: unsupported platform")
        } catch {
            LogError("URLFilter reset: failed to remove configuration: \(error)")
            resetError = error
        }

        self.sharedKeychainStorage.reset()
        self.bloomMetadataStorage.remove()
        await removePrefilterFile()

        return resetError
    }

    // MARK: Private methods

    /// Deletes the prefilter data file from the shared App Group container.
    ///
    /// The file is handed to the system as `.temporaryFilepath`, so it is
    /// normally already removed after the prefilter data was consumed. The
    /// deletion here is a best-effort cleanup for stale files.
    private func removePrefilterFile() async {
        guard await self.groupFolderFileService.isFileExists(relativePath: URLFilterPrefilterFile.name) else {
            return
        }
        if await self.groupFolderFileService.removeFile(relativePath: URLFilterPrefilterFile.name) {
            LogInfo("URLFilter prefilter file removed during reset")
        } else {
            LogError("Failed to remove URLFilter prefilter file during reset")
        }
    }
}
