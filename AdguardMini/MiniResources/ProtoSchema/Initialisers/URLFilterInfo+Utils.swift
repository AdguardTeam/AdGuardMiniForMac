// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterInfo+Utils.swift
//  ProtoSchema
//

extension URLFilterInfo {
    /// Creates read-only URL filter metadata. Optional fields stay unset when `nil`.
    public init(rulesCount: UInt32? = nil, lastUpdate: Int64? = nil) {
        self.init()
        if let rulesCount {
            self.rulesCount = rulesCount
        }
        if let lastUpdate {
            self.lastUpdate = lastUpdate
        }
    }
}
