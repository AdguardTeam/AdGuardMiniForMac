// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterState+Utils.swift
//  SciterSchema
//

extension URLFilterState {
    /// Creates an aggregate URL filter state. `errorMessage` stays unset when `nil`.
    public init(
        status: URLFilterStatus = .unknown,
        configuration: URLFilterConfiguration = URLFilterConfiguration(),
        info: URLFilterInfo = URLFilterInfo(),
        errorMessage: String? = nil
    ) {
        self.init()
        self.status = status
        self.configuration = configuration
        self.info = info
        if let errorMessage {
            self.errorMessage = errorMessage
        }
    }
}
