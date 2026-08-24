// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UpdateResult+Utils.swift
//  AdguardMini
//

import Foundation
import FLM
import ProtoSchema

extension FiltersUpdateResult {
    func toProto() -> FiltersStatus {
        var status: [FilterUpdateStatus] = []

        self.updatedList.forEach { filter in
            status.append(FilterUpdateStatus(id: Int32(filter.filterId), success: true, version: filter.version))
        }
        self.filtersErrors.forEach { filter in
            status.append(FilterUpdateStatus(id: Int32(filter.filterID), success: false, version: ""))
        }
        return FiltersStatus(status: status, error: false)
    }
}
