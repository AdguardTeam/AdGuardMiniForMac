// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterState+Utils.swift
//  ProtoSchema
//

extension URLFilterState {
    /// Creates an aggregate URL filter state. `errorMessage` stays unset when `nil`.
    public init(
        enabled: Bool,
        protectionLevel: URLFilterProtectionLevel,
        status: URLFilterStatus,
        isInstalled: Bool,
        info: URLFilterInfo
    ) {
        self.init()
        self.enabled = enabled
        self.protectionLevel = protectionLevel
        self.status = status
        self.isInstalled = isInstalled
        self.info = info
    }
}
