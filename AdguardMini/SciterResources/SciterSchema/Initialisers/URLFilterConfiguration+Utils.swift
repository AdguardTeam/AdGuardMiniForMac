// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterConfiguration+Utils.swift
//  SciterSchema
//

extension URLFilterConfiguration {
    /// Creates a UI-facing URL filter configuration.
    public init(
        enabled: Bool = false,
        protectionLevel: URLFilterProtectionLevel = .essential,
        isNew: Bool = false,
        isPageNew: Bool = false
    ) {
        self.init()
        self.enabled = enabled
        self.protectionLevel = protectionLevel
        self.isNew = isNew
        self.isPageNew = isPageNew
    }
}
