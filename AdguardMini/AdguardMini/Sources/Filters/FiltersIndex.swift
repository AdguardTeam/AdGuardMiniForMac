// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FiltersIndex.swift
//  AdguardMini
//

import Foundation
import FLM

/// Group with identifier.
enum FiltersDefinedGroup {
    case adBlocking
    case privacy
    case social
    case annoyances
    case security
    case other
    case languageSpecific
    case custom

    var id: Int {
        switch self {
        case .adBlocking:       ReservedFilterGroupId.adBlocking.id
        case .privacy:          ReservedFilterGroupId.privacy.id
        case .social:           ReservedFilterGroupId.social.id
        case .annoyances:       ReservedFilterGroupId.annoyances.id
        case .security:         ReservedFilterGroupId.security.id
        case .other:            ReservedFilterGroupId.other.id
        case .languageSpecific: ReservedFilterGroupId.languageSpecific.id
        case .custom:           FLM.constants.customGroupId
        }
    }
}

struct FiltersDefinedGroups {
    let adBlocking       = FiltersDefinedGroup.adBlocking.id
    let privacy          = FiltersDefinedGroup.privacy.id
    let socialWidgets    = FiltersDefinedGroup.social.id
    let annoyances       = FiltersDefinedGroup.annoyances.id
    let security         = FiltersDefinedGroup.security.id
    let other            = FiltersDefinedGroup.other.id
    let languageSpecific = FiltersDefinedGroup.languageSpecific.id
}

struct FilterTagWithLang {
    let lang: String
    let tagId: Int
    let keyword: String
}

enum AdGuardAdditionalFilterId {
    static let unblockSearchAdsFilterId: Int = 10

    /// Id of AdGuard Mail Tracking Protection filter.
    static let mailTrackingProtection: Int = 25
}

private enum Constants {
    static let mobileAdsFilterId = 11
}

/// IDs of the annoyance filters into which the rudimentary annoyance filter was divided.
enum AdGuardAnnoyancesFilterId {
    /// Id of cookie notice filter.
    static let cookieNotice: Int = 18

    /// Id of pop ups filter.
    static let popUps: Int = 19

    /// Id of filter for widgets.
    static let widgets: Int = 22

    /// Id of filter for other annoyance ads.
    static let otherAnnoyance: Int = 21

    /// Id of AdGuard Mobile App Banners filter
    static let mobileBanners: Int = 20

    static var allIds: [Int] {
        [
            Self.cookieNotice,
            Self.popUps,
            Self.widgets,
            Self.otherAnnoyance,
            Self.mobileBanners
        ]
    }
}

// MARK: - Filters index for safari protection switchers

protocol FiltersIndex {
    var unblockSearchAdsFilterId: Int { get }
    var cookieNoticeFilterId: Int { get }
    var popUpsFilterId: Int { get }
    var widgetsFilterId: Int { get }
    var otherAnnoyanceFilterId: Int { get }
    var mobileBannersFilter: Int { get }
    var annoyanceFiltersIds: [Int] { get }
    var definedGroups: FiltersDefinedGroups { get }
    var groups: [FilterGroup] { get }
    var filtersByGroups: [Int: [Int]] { get }
    var recommendedFiltersIdsByGroupDict: [Int: [Int]] { get }
    var otherFiltersIdsByGroupDict: [Int: [Int]] { get }
    var customGroupId: Int { get }
}

// MARK: - Implementation for FiltersIndex

final class FiltersIndexImpl: FiltersIndex {
    /// Id of filter to unblock search ads.
    let unblockSearchAdsFilterId: Int = AdGuardAdditionalFilterId.unblockSearchAdsFilterId

    /// Id of cookie notice filter.
    let cookieNoticeFilterId: Int = AdGuardAnnoyancesFilterId.cookieNotice

    /// Id of pop ups filter.
    let popUpsFilterId: Int = AdGuardAnnoyancesFilterId.popUps

    /// Id of filter for widgets.
    let widgetsFilterId: Int = AdGuardAnnoyancesFilterId.widgets

    /// Id of filter for other annoyance ads.
    let otherAnnoyanceFilterId: Int = AdGuardAnnoyancesFilterId.otherAnnoyance

    /// Id of AdGuard Mobile App Banners filter
    let mobileBannersFilter: Int = AdGuardAnnoyancesFilterId.mobileBanners

    /// Array of annoyance filters ids
    let annoyanceFiltersIds: [Int]

    /// Defined groups ids.
    let definedGroups: FiltersDefinedGroups = FiltersDefinedGroups()

    /// Groups metadata.
    let groups: [FilterGroup]

    /// All filters ids combined by filter group id.
    let filtersByGroups: [Int: [Int]]

    /// Only recommended filters combined by filter group id.
    let recommendedFiltersIdsByGroupDict: [Int: [Int]]

    /// Other (not recommended)  filters combined by filter group id.
    let otherFiltersIdsByGroupDict: [Int: [Int]]

    let recommendedTagId: Int

    let customGroupId: Int

    init(filters: [FilterInfo], tags: [FilterTag], groups: [FilterGroup], customGroupId: Int) {
        let recommendedTag = tags.first { $0.keyword == "recommended" }?.id ?? 0
        self.recommendedTagId = recommendedTag
        self.customGroupId = customGroupId

        var filtersByGroups: [Int: [Int]] = [:]
        var recommendedFiltersIdsByGroupDict: [Int: [Int]] = [:]
        var otherFiltersIdsByGroupDict: [Int: [Int]] = [:]

        self.groups = groups

        groups.forEach { group in
            let groupId = group.id
            let groupFilters = filters.filter { filter in
                filter.groupId == groupId
            }
            filtersByGroups[groupId] = []
            recommendedFiltersIdsByGroupDict[groupId] = []
            otherFiltersIdsByGroupDict[groupId] = []

            groupFilters.forEach { filter in
                let filterId = filter.filterId
                filtersByGroups[groupId]?.append(filterId)
                let hasRecommendedTag = filter.tags.contains { $0.id == recommendedTag }
                // Mobile Ads filter is not recommended due to it is not applicable for Desktop, ask filters team for details
                if hasRecommendedTag, filterId != Constants.mobileAdsFilterId {
                    recommendedFiltersIdsByGroupDict[groupId]?.append(filterId)
                } else {
                    otherFiltersIdsByGroupDict[groupId]?.append(filterId)
                }
            }
        }

        self.filtersByGroups = filtersByGroups
        self.recommendedFiltersIdsByGroupDict = recommendedFiltersIdsByGroupDict
        self.otherFiltersIdsByGroupDict = otherFiltersIdsByGroupDict

        let annoyancesDefinedGroup = self.definedGroups.annoyances

        var annoyanceFiltersIds = [
            self.cookieNoticeFilterId,
            self.otherAnnoyanceFilterId,
            self.widgetsFilterId,
            self.popUpsFilterId
        ]
        annoyanceFiltersIds.append(contentsOf: self.recommendedFiltersIdsByGroupDict[annoyancesDefinedGroup] ?? [])
        annoyanceFiltersIds.append(contentsOf: self.otherFiltersIdsByGroupDict[annoyancesDefinedGroup] ?? [])

        self.annoyanceFiltersIds = annoyanceFiltersIds
    }
}
