// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ImportStatusDTO+Utils.swift
//  AdguardMini
//

import ProtoSchema

extension ImportStatusDTO {
    func toProto() -> ImportStatus {
        ImportStatus(success: self.success, filtersIds: self.consentFiltersIds.map(Int32.init))
    }
}
