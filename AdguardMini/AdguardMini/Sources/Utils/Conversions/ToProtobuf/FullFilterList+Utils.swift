// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FullFilterList+Utils.swift
//  AdguardMini
//

import Foundation
import FLM
import ProtoSchema

extension FilterInfo {
    func toFilterProto(rulesCount: Int) -> Filter {
        Filter(
            id: Int32(self.filterId),
            groupID: Int32(self.groupId),
            enabled: self.isEnabled,
            timeUpdated: self.timeUpdated,
            title: self.name,
            description_p: self.summary,
            version: self.version,
            homepage: self.homepage,
            rulesCount: Int32(rulesCount),
            languages: self.languages,
            trusted: self.isTrusted
        )
    }

    func toCustomFilterDTO(rules: [String]) -> CustomFilterDTO {
        CustomFilterDTO(
            downloadUrl: self.url,
            lastDownloadTime: self.lastDownloadTime,
            isEnabled: self.isEnabled,
            isTrusted: self.isTrusted,
            rules: rules,
            customTitle: self.name,
            customDescription: self.summary
        )
    }
}
