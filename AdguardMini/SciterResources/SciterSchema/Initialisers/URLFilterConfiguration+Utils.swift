// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterConfiguration+Utils.swift
//  SciterSchema
//

extension URLFilterConfiguration {
    /// Creates a UI-facing URL filter configuration.
    public init(enabled: Bool = false, protectionLevel: URLFilterProtectionLevel = .essential) {
        self.init()
        self.enabled = enabled
        self.protectionLevel = protectionLevel
    }
}
