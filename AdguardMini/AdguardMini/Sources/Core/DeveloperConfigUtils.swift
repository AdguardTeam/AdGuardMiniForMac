// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  DeveloperConfigUtils.swift
//  AdguardMini
//

import Foundation
import AML

private enum Constants {
    static let devConfigFileName = "devConfig.json"
}

// MARK: DeveloperConfigUtils

/// Helper object for loading any configurations properties from the so-called dev-config.
/// Such properties can be read from the developer config
/// instead of following a customer's build behavior for setting such values
///
/// File **devConfig.json** must be placed in `Shared product data directory`
///
/// It is `/Library/Application Support/AdGuard Software Limited/com.adguard.safari.AdGuard`.
///
/// File must have owner **root** and readonly rights for others.
struct DeveloperConfigUtils {
    // MARK: DeveloperConfigUtils.Property

    enum Property: String, CaseIterable {
        /// Value is integer number of seconds.
        case filtersTimerCheckPeriod = "filters_timer_check_period"
        /// Value is integer number of seconds.
        case filtersDiffUpdatePeriod = "filters_diff_update_period"
        /// Value is integer number of seconds.
        case filtersFullUpdatePeriod = "filters_full_update_period"

        /// Value is integer number of seconds.
        case rateUsFirstDuration = "rate_us_first_duration"
        /// Value is integer number of seconds.
        case rateUsSecondDuration = "rate_us_second_duration"
        /// Value is integer number of seconds.
        case rateUsThirdDuration = "rate_us_third_duration"

        /// Value is string with URL to the backend API host.
        case backendApiUrl = "backend_api_url"
        /// Value is string with URL to the web API host.
        case webApiUrl = "web_api_url"
        /// Value is string with URL to the subscription API host.
        case subscribeApiUrl = "subscribe_api_url"
        /// Value is string with URL to the reports API host.
        case reportsApiUrl = "reports_api_url"
        /// Value is string with URL to the telemetry API host.
        case telemetryApiUrl = "telemetry_api_url"

        /// Value is string with url to the adblock filter index file.
        case filtersMetaUrl = "filters_meta_url"
        /// Value is string with url to the adblock filters localization file.
        case filtersI18nUrl = "filters_i18n_url"

        /// Value is a dictionary mapping experiment names to options.
        ///
        /// Example: `{"AG-51019-Advanced-settings": "optA"}`.
        /// Valid options: `"optA"`, `"optB"`, `"notInTest"`
        case abTestOverrides = "ab_tests"

        /// Value is a dictionary overriding URL filter level configurations.
        ///
        /// It is keyed by protection level (`essential`, `safe`, `family`).
        /// Each entry may contain `pir_server_url`, `pir_privacy_pass_issuer_url`,
        /// `pir_authentication_token` and `bloom_params_url`; unset fields keep
        /// the compiled-in defaults.
        ///
        /// Example: `{"essential": {"pir_server_url": "...", "pir_authentication_token": "..."}}`.
        case urlFilterLevelOverrides = "url_filter"

        /// Value is an integer UID overriding the account UID used by the
        /// URL-filter `non501User` check.
        ///
        /// System-wide protection (URL filter) is only available to the first
        /// admin account (UID 501). This override lets a development build on a
        /// non-501 account emulate UID 501 without changing the actual user;
        /// setting it to `501` effectively disables the account check.
        ///
        /// Example: `{"url_filter_override_uid": 501}`.
        case urlFilterOverrideUID = "url_filter_override_uid"
    }

    // MARK: Public properties and methods

    static subscript(name: Property) -> Any? {
        Self.queue.sync(flags: .barrier) {
            if Self.forceToReload {
                Self.config = [:]
                if self.checkFile() {
                    LogDebug("Reloading \(Constants.devConfigFileName)")
                    Self.config = self.parse()
                } else {
                    LogDebug("Skipping to reload \(Constants.devConfigFileName) - incorrect file permissions")
                }
                Self.forceToReload = false
            }
            return Self.config[name.rawValue]
        }
    }

    /// Returns devConfig.json file url.
    static let fileUrl: URL! = {
        guard let appSupportURL = try? FileManager.default.url(
            for: .applicationSupportDirectory, in: .localDomainMask,
            appropriateFor: nil, create: false)
        else { return nil }

        let directoryURL: URL? = {
            let directoryURL = appSupportURL.appendingPathComponent("\(BuildConfig.AG_COMPANY)/\(BuildConfig.AG_APP_ID)")

            let exists = try? directoryURL.checkResourceIsReachable()
            do {
                try FileManager.default.createDirectory(
                    at: directoryURL,
                    withIntermediateDirectories: true,
                    attributes: nil
                )
            } catch {
                if exists ?? false {
                    return directoryURL
                }
                LogDebug("Cannot create 'Shared data' directory (\(directoryURL.path)) with error: \(error)")
                return nil
            }
            return directoryURL
        }()
        return directoryURL?.appendingPathComponent(Constants.devConfigFileName)
    }()

    /// Forces to reload devConfig.json.
    static func reload() {
        Self.queue.async(flags: .barrier) {
            Self.forceToReload = true
        }
    }

    /// True if config is empty.
    static var isEmpty: Bool {
        Self.queue.sync {
            Self.config.isEmpty
        }
    }

    /// Config file content
    static var description: String {
        Self.queue.sync {
            var result = ""
            if !Self.config.isEmpty {
                for key in Self.Property.allCases {
                    if let value = Self.config[key.rawValue] {
                        result += "\t\(key.rawValue): \(value)\n"
                    } else {
                        result += "\t\(key.rawValue): none\n"
                    }
                }
            }

            return result
        }
    }

    // MARK: Private

    private static let queue = DispatchQueue(label: "dev.config.queue", attributes: .concurrent)
    // Both properties are serialized by `queue`.
    // Reads run inside sync blocks, mutations inside barrier blocks.
    // The compiler-level concurrency check is therefore safely disabled.
    nonisolated(unsafe) private static var config: [String: Any] = [:]
    nonisolated(unsafe) private static var forceToReload = true

    private static func checkFile() -> Bool {
        guard let fileUrl = self.fileUrl else {
            LogDebug("Can't obtain url for dev config file.")
            return false
        }
        var err: NSError?
        guard (fileUrl as NSURL).checkResourceIsReachableAndReturnError(&err) else {
            LogDebug("Dev config file not exists: \(String(describing: err))")
            return false
        }
        var attrs: NSDictionary?
        do {
            attrs = try FileManager.default.attributesOfItem(atPath: fileUrl.path) as NSDictionary
        } catch {
            LogError("Can't get attributes of the \"\(fileUrl)\" with error: \(error)")
            return false
        }
        guard let owner = attrs?.fileOwnerAccountID(),
            owner.intValue == 0 else {
                LogError("Dev config file is not root owned")
                return false
        }
        guard let permission = attrs?.filePosixPermissions(),
            permission != 0,
            (permission & 0o033) == 0 else {
                LogError("Dev config file must have permissions readonly for other")
                return false
        }
        return true
    }

    private static func parse() -> [String: Any] {
        do {
            let data = try Data(contentsOf: fileUrl)
            if let result = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                return result
            }
            LogError("Valid JSON, but invalid dev config JSON")
        } catch {
            LogError("Can't convert dev config json with error: \(error)")
        }
        return [:]
    }

    /// Prevents instantiating
    private init() {}
}
