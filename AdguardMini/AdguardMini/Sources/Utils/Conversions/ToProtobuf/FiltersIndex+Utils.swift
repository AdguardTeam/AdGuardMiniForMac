// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FiltersIndex+Utils.swift
//  AdguardMini
//

import Foundation
import struct FLM.FilterGroup
import ProtoSchema

extension FilterGroup {
    func toProto() -> ProtoSchema.FilterGroup {
        ProtoSchema.FilterGroup(
            groupID: Int32(self.id),
            groupName: self.name,
            displayNumber: Int32(self.displayNumber)
        )
    }
}

extension FiltersIndex {
    func toProto() -> ProtoSchema.FiltersIndex {
        var filtersByGroups: [Int32: FiltersIds] = [:]
        var recommendedFiltersIdsByGroupDict: [Int32: FiltersIds] = [:]
        var otherFiltersIdsByGroupDict: [Int32: FiltersIds] = [:]

        self.filtersByGroups.forEach { (key: Int, value: [Int]) in
            filtersByGroups[Int32(key)] = FiltersIds(value.map(Int32.init))
        }

        self.recommendedFiltersIdsByGroupDict.forEach { (key: Int, value: [Int]) in
            recommendedFiltersIdsByGroupDict[Int32(key)] = FiltersIds(value.map(Int32.init))
        }

        self.otherFiltersIdsByGroupDict.forEach { (key: Int, value: [Int]) in
            otherFiltersIdsByGroupDict[Int32(key)] = FiltersIds(value.map(Int32.init))
        }

        return ProtoSchema.FiltersIndex(
            unblockSearchAdsFilterID: Int32(self.unblockSearchAdsFilterId),
            cookieNoticeFilterID: Int32(self.cookieNoticeFilterId),
            popUpsFilterID: Int32(self.popUpsFilterId),
            widgetsFilterID: Int32(self.widgetsFilterId),
            otherAnnoyanceFilterID: Int32(self.otherAnnoyanceFilterId),
            mobileBannersFilter: Int32(self.mobileBannersFilter),
            groups: self.groups.map { $0.toProto() },
            filtersByGroups: filtersByGroups,
            recommendedFiltersIdsByGroupDict: recommendedFiltersIdsByGroupDict,
            otherFiltersIdsByGroupDict: otherFiltersIdsByGroupDict,
            definedGroups: ProtoSchema.FiltersDefinedGroups(
                adBlocking: Int32(self.definedGroups.adBlocking),
                privacy: Int32(self.definedGroups.privacy),
                socialWidgets: Int32(self.definedGroups.socialWidgets),
                annoyances: Int32(self.definedGroups.annoyances),
                security: Int32(self.definedGroups.security),
                other: Int32(self.definedGroups.other),
                languageSpecific: Int32(self.definedGroups.languageSpecific)
            ),
            customGroupId: Int32(self.customGroupId)
        )
    }
}
