// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ExchangeSettingsModel.swift
//  Adguard
//

// swiftlint:disable discouraged_optional_collection
// swiftlint:disable discouraged_optional_boolean

import Foundation
import FLM

typealias ExchangeSettingsVersion = String

// MARK: ExchangeSettingsModel Implementation

enum ExchangeSettingsModel {
    static let version: ExchangeSettingsVersion = "1"

    static func modelType(for settingsType: ExchangeSettingsItemType) -> (any ExchangeSettingsItemModel.Type)? {
        switch settingsType {
        case .preferences:     self.Preferences
        case .blockingFilters: self.BlockingFilter
        case .legacyGroups:    nil
        case .base:            nil
        }
    }
}

// MARK: - MODELS

extension ExchangeSettingsModel {
    // MARK: Preferences model

    struct Preferences: ExchangeSettingsItemModel {
        // Shared settings

        var protectionEnabled: Bool?
        var advancedBlocking: Bool?
        var advancedRules: Bool?
        var adguardExtra: Bool?
        var launchOnStartup: Bool?
        var showSafariToolbarBadge: Bool?

        // App level settings

        var quitOption: Int?
        var showInMenuBar: Bool?

        var autoFiltersUpdate: Bool?
        var realTimeFiltersUpdate: Bool?
        var languageSpecific: Bool?
    }
}

extension ExchangeSettingsModel.Preferences {
    static let allKeys: Set<String> = {
        Self().allKeys
    }()

    var allKeys: Set<String> {
        Set(Mirror(reflecting: self).children.map { $0.label! })
    }

    init(plist: [String: Any], progress: Progress? = nil) throws {
        let data = try PropertyListSerialization.data(fromPropertyList: plist, format: .binary, options: 0)

        if progress?.isCancelled ?? false {
            throw ExchangeSettingsModelError.canceled
        }

        let decoder = PropertyListDecoder()
        self = try decoder.decode(Self.self, from: data)
    }

    func entity(progress: Progress?) throws -> [String: Any] {
        let encoder = PropertyListEncoder()
        encoder.outputFormat = .binary
        let data = try encoder.encode(self)

        if progress?.isCancelled ?? false {
            throw ExchangeSettingsModelError.canceled
        }

        return try PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] ?? [:]
    }
}

extension ExchangeSettingsModel {
    // MARK: BlockingFilter model

    struct BlockingFilter: ExchangeSettingsItemModel {
        static let dtoKey: String = "dto"

        var filterId:        Int = FLM.constants.userRulesId
        var updateTime:      TimeInterval?
        var version:         String?
        var enabled:         Bool?
        var custom:          Bool?
        var displayNumber:   Int?
        var groupId:         Int?
        var name:            String?
        var descr:           String?
        var homepage:        String?
        var expires:         Int?
        var subscriptionUrl: String?
        var tags:            [Int]?
        var trusted:         Bool?
        var langs:           [String]?
        var rules:           [Rule]?
        var installed:       Bool?

        struct Rule: Codable {
            var ruleText: String
            var enabled: Bool
        }

        init(dto: FilterDTO, progress: Progress?) throws {
            guard let meta = dto.meta else {
                throw ExchangeSettingsModelError.entityCasting.log()
            }

            self.filterId        = meta.filterId
            self.updateTime      = meta.timeUpdated
            self.version         = meta.version
            self.enabled         = meta.isEnabled
            self.custom          = meta.isCustom
            self.displayNumber   = meta.displayNumber
            self.groupId         = meta.groupId
            self.name            = meta.name
            self.descr           = meta.summary
            self.homepage        = meta.homepage
            self.expires         = meta.expires
            self.subscriptionUrl = meta.url
            self.tags            = meta.tags
            self.trusted         = meta.isTrusted
            self.langs           = meta.languages
            self.installed       = meta.isInstalled

            let rules = dto.rules

            self.rules = rules?.map { rule in
                Rule(ruleText: rule.ruleText,
                     enabled: rule.isEnabled)
            } ?? []
        }

        init(dict: [String: Any], progress: Progress?) throws {
            if let dto = dict[Self.dtoKey] as? FilterDTO {
                self = try BlockingFilter(dto: dto, progress: progress)
                return
            }

            guard let filterId = dict["filterId"] as? Int else {
                throw ExchangeSettingsModelError.entityCasting.log()
            }

            if let timeInterval = dict["updateDate"] as? TimeInterval {
                self.updateTime = timeInterval
            }

            self.filterId        = filterId
            self.version         = dict["version"] as? String
            self.enabled         = dict["enabled"] as? Bool ?? false
            self.custom          = dict["custom"] as? Bool
            self.displayNumber   = dict["displayNumber"] as? Int
            self.groupId         = dict["groupId"] as? Int
            self.name            = dict["name"] as? String
            self.descr           = dict["descr"] as? String
            self.homepage        = dict["homepage"] as? String
            self.expires         = dict["expires"] as? Int
            self.subscriptionUrl = dict["subscriptionUrl"] as? String
            self.trusted         = dict["trusted"] as? Bool
            self.langs           = dict["langs"] as? [String]
            self.installed       = dict["installed"] as? Bool

            if let rules = dict["rules"] as? [[String: Any]] {
                self.rules = rules.compactMap {
                    let enabled = $0["enabled"] as? Bool ?? true
                    guard let ruleText = $0["ruleText"] as? String
                    else {
                        return nil
                    }
                    return Rule(ruleText: ruleText, enabled: enabled)
                }
            }
        }

        func entity(progress: Progress?) throws -> FilterDTO {
            let meta = FilterMetaDTO(
                filterId:      self.filterId,
                groupId:       self.groupId,
                timeUpdated:   self.updateTime,
                name:          self.name,
                summary:       self.descr,
                version:       self.version,
                displayNumber: self.displayNumber,
                url:           self.subscriptionUrl,
                expires:       self.expires,
                isCustom:      self.custom,
                homepage:      self.homepage,
                languages:     self.langs,
                tags:          self.tags,
                isTrusted:     self.trusted,
                isEnabled:     self.enabled,
                isInstalled:   self.installed
            )

            let rules = self.rules?.map { rule in
                FilterRuleDTO(
                    ruleText: rule.ruleText,
                    isEnabled: rule.enabled
                )
            } ?? []

            return FilterDTO(
                meta: meta,
                rules: rules
            )
        }
    }
}

// swiftlint:enable discouraged_optional_collection
// swiftlint:enable discouraged_optional_boolean
