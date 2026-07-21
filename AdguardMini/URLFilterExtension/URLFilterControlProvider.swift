// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import NetworkExtension
import ExtensionFoundation

import AML

// MARK: - Constants

private enum Constants {
    static let prefilterFileName = "urlfilter-prefilter-bloomfilterdata"
}

// MARK: - URLFilterControlProvider

@main
final class URLFilterControlProvider: NEURLFilterControlProvider {
    private let fileStorage: GroupFolderFileService = GroupFolderFileServiceImpl()
    private let keychainStorage: SharedKeychainStorage = SharedKeychainStorageImpl()

    init() {
        LogConfig.setupSharedLogger(for: .urlFilterExtension)
    }

    func start() async throws {
        LogInfo("start")
    }

    // NEProviderStopReason has a lot of cases
    // swiftlint:disable:next cyclomatic_complexity
    func stop(reason: NEProviderStopReason) async throws {
        var message: String
        switch reason {
        case .none:
            message = "No specific reason."
        case .userInitiated:
            message = "The user stopped the provider."
        case .providerFailed:
            message = "The provider failed."
        case .noNetworkAvailable:
            message = "There is no network connectivity."
        case .unrecoverableNetworkChange:
            message = "The device attached to a new network."
        case .providerDisabled:
            message = "The provider was disabled."
        case .authenticationCanceled:
            message = "The authentication process was cancelled."
        case .configurationFailed:
            message = "The provider could not be configured."
        case .idleTimeout:
            message = "The provider was idle for too long."
        case .configurationDisabled:
            message = "The associated configuration was disabled."
        case .configurationRemoved:
            message = "The associated configuration was deleted."
        case .superceded:
            message = "A high-priority configuration was started."
        case .userLogout:
            message = "The user logged out."
        case .userSwitch:
            message = "The active user changed."
        case .connectionFailed:
            message = "Failed to establish connection."
        case .sleep:
            message = "The device went to sleep and disconnectOnSleep is enabled in the configuration."
        case .appUpdate:
            message = "The NEProvider is being updated."
        case .internalError:
            message = "An internal error occurred in the NetworkExtension framework."
        @unknown default:
            message = "Unknown reason."
        }
        LogInfo("stop: \(message)")
    }

    func fetchPrefilter(existingPrefilterTag: String?) async throws -> NEURLFilterPrefilter? {
        do {
            // Step 0: Determine the bloom‑params URL for the current protection level
            let protectionLevel = self.keychainStorage.urlFilterProtectionLevel
            guard let levelConfig = URLFilterLevelConfiguration.defaultLevels[protectionLevel] else {
                LogError("No level configuration for protection level \(protectionLevel.rawValue)")
                return nil
            }
            let paramsURL = levelConfig.bloomParamsURL.absoluteString
            LogInfo("Using protection level \(protectionLevel.rawValue), params URL: \(paramsURL)")

            guard let url = URL(string: paramsURL) else {
                LogError("Invalid URL for bloom params: \(paramsURL)")
                return nil
            }

            let (paramsData, _) = try await URLSession.shared.data(from: url)

            // Parse the JSON response
            struct BloomParams: Codable {
                let falsePositiveTolerance: Double
                let murmurSeed: UInt32
                let numberOfBits: Int
                let numberOfHashes: Int
                let tag: String
                let url: String
            }

            let params: BloomParams
            do {
                params = try JSONDecoder().decode(BloomParams.self, from: paramsData)
                LogInfo("Bloom params decoded: tag=\(params.tag), bits=\(params.numberOfBits), hashes=\(params.numberOfHashes)")
            } catch {
                LogError("Failed to decode bloom params: \(error)")
                return nil
            }

            // Step 2: Check if tag is the same as existing
            if let existingTag = existingPrefilterTag, existingTag == params.tag {
                LogInfo("Bloom filter tag unchanged (\(params.tag)), returning nil")
                return nil
            }

            // Step 3: Download the raw bloom filter data
            LogInfo("Downloading bloom filter data from \(params.url)")

            guard let bloomURL = URL(string: params.url) else {
                LogError("Invalid URL for bloom filter data: \(params.url)")
                return nil
            }

            let (bloomData, response) = try await URLSession.shared.data(from: bloomURL)
            LogInfo("Downloaded bloom filter data: \(bloomData.count) bytes")

            if let httpResponse = response as? HTTPURLResponse {
                LogInfo("HTTP response status: \(httpResponse.statusCode)")
            }

            // Step 4: Persist the data to a file inside the shared App Group
            guard await fileStorage.saveFile(
                data: bloomData,
                relativePath: Constants.prefilterFileName)
            else {
                LogError("Failed to write prefilter file to shared container")
                return nil
            }

            let fileURL = fileStorage.buildUrl(relativePath: Constants.prefilterFileName)
            LogInfo("Bloom filter data written to shared container at \(fileURL.path)")

            // Step 5: Initialize NEURLFilterPrefilter with the temporary file path
            let prefilterData: NEURLFilterPrefilter.PrefilterData = .temporaryFilepath(fileURL)
            let preFilter = NEURLFilterPrefilter(
                data: prefilterData,
                tag: params.tag,
                bitCount: params.numberOfBits,
                hashCount: params.numberOfHashes,
                murmurSeed: params.murmurSeed)

            LogInfo("Prefilter created successfully with tag \(params.tag)")

            return preFilter
        } catch {
            LogError("Failed to fetch or parse bloom filter params: \(error)")
            return nil
        }
    }
}
