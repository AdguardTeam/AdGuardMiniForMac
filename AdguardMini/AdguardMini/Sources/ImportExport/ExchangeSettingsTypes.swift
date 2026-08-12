// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ExchangeSettingsTypes.swift
//  Adguard
//

import Foundation
import AML

// MARK: ExchangeSettingsItemType Interface

/// Exchanging settings type, which are supported
enum ExchangeSettingsItemType: String, Codable, Equatable, CaseIterable {
    case
    base,
    preferences,
    blockingFilters,
    legacyGroups
}

extension ExchangeSettingsItemType: CustomStringConvertible {
    var description: String {
        switch self {
        case .base:            "Unknown Type"
        case .preferences:     "Preferences"
        case .blockingFilters: "Blocking Filter"
        case .legacyGroups:    "Legacy Groups"
        }
    }
}

// MARK: ExchangeSettingsModelError Interface

/// Objective C compatible SettingsExport errors
enum ExchangeSettingsModelError: ConvertableError, Equatable {
    case
    oldVersion,
    dictCasting,
    entityCasting,
    canceled,
    other(Error)
}

// MARK: ExchangeSettingsModelManifest

struct ExchangeSettingsModelManifest: Codable {
    // MARK: Public properties

    /// Max length of the manifest section in file.
    static let MaxLength = 1024

    /// Version identifier.
    var version: ExchangeSettingsVersion
    /// Application version.
    var appVersion: String
    /// Datetime in seconds since 1970.
    var timestamp: TimeInterval
    /// Settings type.
    var settingsType: ExchangeSettingsItemType

    private(set) var dataEndIndex: Data.Index?

    // MARK: Init

    init() {
        self.version = ExchangeSettingsModel.version
        self.appVersion = BuildConfig.AG_VERSION_TITLE
        self.timestamp = Date().timeIntervalSince1970
        self.settingsType = .base
    }

    init(settingsType: ExchangeSettingsItemType) {
        self.init()
        self.settingsType = settingsType
    }

    init(
        version: ExchangeSettingsVersion,
        appVersion: String,
        timestamp: TimeInterval = Date().timeIntervalSince1970,
        settingsType: ExchangeSettingsItemType
    ) {
        self.init()
        self.version = version
        self.appVersion = appVersion
        self.timestamp = timestamp
        self.settingsType = settingsType
    }

    /// Simple init from data,
    /// where is performed search json like: `manifest = {"version": "1", "appVersion": "MacOS AdGuard Mini", "timestamp": 201321, "settingsType": "preferences"}`
    init?(data: Data) {
        guard let manifestRange = data.range(of: ExchangeSettings.ManifestCodableKey.data(using: .utf8)!)
        else { return nil }

        let searchRange = manifestRange.upperBound..<data.count
        guard let startRange = data.range(of: Data("{".utf8), in: searchRange) else { return nil }
        guard let endRange = data.range(of: Data("}".utf8), in: searchRange) else { return nil }
        let manifestJson = data[startRange.lowerBound..<endRange.upperBound]
        guard var instance = try? JSONDecoder().decode(Self.self, from: manifestJson) else { return nil }
        instance.dataEndIndex = endRange.upperBound
        self = instance
    }

    init?(json: [String: Any]) {
        guard let version = json["version"] as? String,
              let appVersion = json["appVersion"] as? String,
              let timestamp = json["timestamp"] as? TimeInterval,
              let settingsType = ExchangeSettingsItemType(rawValue: (json ["settingsType"] as? String) ?? "")
        else { return nil }

        self.version = version
        self.appVersion = appVersion
        self.timestamp = timestamp
        self.settingsType = settingsType
    }
}

extension ExchangeSettingsModelManifest: CustomStringConvertible {
    var description: String {
        "[\(debug: self) type: \(self.settingsType), version: \(self.version), appVersion: \(self.appVersion), timestamp: \(Date(timeIntervalSince1970: self.timestamp))]"
    }
}

/// Model of settings suitable for exporting/importing.
protocol ExchangeSettingsItemModel: Codable {
    associatedtype EntityType
    /// Returns AdGuard entity from instance
    func entity(progress: Progress?) throws -> EntityType
    /// Returns model as JSON data
    func data(progress: Progress?) throws -> Data
}

extension ExchangeSettingsItemModel {
    func data(progress: Progress?) throws -> Data {
        let encoder = JSONEncoder()
        encoder.dataEncodingStrategy = ExchangeSettings.dataEncodingStrategy
        encoder.dateEncodingStrategy = ExchangeSettings.dateEncodingStrategy
        encoder.outputFormatting = ExchangeSettings.dateEncodingOutFormat

        return try encoder.encode(self)
    }
}

/// Container, which represents settings logical block for exchange (settings file) as data objects.
struct ExchangeSettingsContainer {
    /// JSON file URL.
    var url: URL
    /// Manifest, what is this payload.
    var manifest: ExchangeSettingsModelManifest
    /// Model of the settings ( representation of a settings logical block of the app ).
    var payload: [String: Any]
    /// Id of filter when payload is filter
    var filterId: Int? {
        self.payload["filterId"] as? Int
    }
}

// MARK: ExchangeSettingsModelError Implementation

extension ExchangeSettingsModelError {
    static var errorDomain: String = "ExchangeSettingsModelErrorDomain"

    var errorDescription: String? {
        "Unknown error"
    }

    var errorDebugDescription: String? {
        switch self {
        case .oldVersion:     "Must be implemented only in actual version of a model"
        case .dictCasting:    "Cannot cast dictionary into appropriate type"
        case .entityCasting:  "Cannot cast entity into appropriate type"
        case .canceled:       "Operation canceled"
        case .other(let err): "\(err)"
        }
    }

    static func == (lhs: ExchangeSettingsModelError, rhs: ExchangeSettingsModelError) -> Bool {
        switch (lhs, rhs) {
        case (.other, .other): false
        default: lhs.errorCode == rhs.errorCode
        }
    }
}
