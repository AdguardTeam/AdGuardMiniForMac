// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterState.swift
//  AdguardMini
//

import Foundation

// MARK: - URLFilterState

/// Represents the state of the URL filter extension.
struct URLFilterState {
    let enabled: Bool
    let status: URLFilterRawStatus
    let serverURL: URL?
    let issuerURL: URL?
    let lastDisconnectError: URLFilterError?
}
