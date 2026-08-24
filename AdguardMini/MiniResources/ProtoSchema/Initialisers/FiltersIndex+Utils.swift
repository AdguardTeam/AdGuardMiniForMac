// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FiltersIndex+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension FilterGroup {
    public init (
        groupID: Int32 = 0,
        groupName: String = "",
        displayNumber: Int32 = 0
    ) {
        self.init()
        self.groupID = groupID
        self.groupName = groupName
        self.displayNumber = displayNumber
    }
}

extension FiltersDefinedGroups {
    public init(
        adBlocking: Int32 = 0,
        privacy: Int32 = 0,
        socialWidgets: Int32 = 0,
        annoyances: Int32 = 0,
        security: Int32 = 0,
        other: Int32 = 0,
        languageSpecific: Int32 = 0
    ) {
        self.init()
        self.adBlocking = adBlocking
        self.privacy = privacy
        self.socialWidgets = socialWidgets
        self.annoyances = annoyances
        self.security = security
        self.other = other
        self.languageSpecific = languageSpecific
    }
}

extension FiltersIds {
    public init(_ ids: [Int32]) {
        self.init()
        self.ids = ids
    }
}

extension FiltersIndex {
    public init(
         unblockSearchAdsFilterID: Int32 = 0,
         cookieNoticeFilterID: Int32 = 0,
         popUpsFilterID: Int32 = 0,
         widgetsFilterID: Int32 = 0,
         otherAnnoyanceFilterID: Int32 = 0,
         mobileBannersFilter: Int32 = 0,
         groups: [FilterGroup] = [],
         filtersByGroups: [Int32: FiltersIds] = [:],
         recommendedFiltersIdsByGroupDict: [Int32: FiltersIds] = [:],
         otherFiltersIdsByGroupDict: [Int32: FiltersIds] = [:],
         definedGroups: FiltersDefinedGroups,
         customGroupId: Int32
    ) {
        self.init()
        self.unblockSearchAdsFilterID = unblockSearchAdsFilterID
        self.cookieNoticeFilterID = cookieNoticeFilterID
        self.popUpsFilterID = popUpsFilterID
        self.widgetsFilterID = widgetsFilterID
        self.mobileBannersFilter = mobileBannersFilter
        self.otherAnnoyanceFilterID = otherAnnoyanceFilterID
        self.groups = groups
        self.filtersByGroups = filtersByGroups
        self.recommendedFiltersIdsByGroupDict = recommendedFiltersIdsByGroupDict
        self.otherFiltersIdsByGroupDict = otherFiltersIdsByGroupDict
        self.definedGroups = definedGroups
        self.customGroupID = customGroupId
    }
}
