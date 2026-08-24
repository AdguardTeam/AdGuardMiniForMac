// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterUIState.swift
//  AdguardMini
//

import Foundation

// MARK: - URLFilterUIState

/// UI-facing aggregate of the URL filter state, expressed in pure Swift types.
///
/// Produced by ``URLFilterStateAssembler`` and converted to the Protobuf
/// `URLFilterState` by an app-target-only `toProto()` extension.
struct URLFilterUIState: Equatable {
    /// Whether the filter is currently enabled.
    var enabled: Bool
    /// Derived URL filter status.
    var status: URLFilterUIStatus
    /// Selected protection level.
    var protectionLevel: URLFilterProtectionLevel
    /// Whether the settings card is still marked as new.
    var isInstalled: Bool
    /// Read-only metadata.
    var info: URLFilterInfo
}

extension URLFilterUIState {
    static let error: Self = .init(
        enabled: false,
        status: .error,
        protectionLevel: .essential,
        isInstalled: false,
        info: .empty
    )
}

// MARK: - URLFilterUIStatus

/// UI-facing status of URLFiltering extension
enum URLFilterUIStatus: Equatable {
    case error
    case loading
    case running
}
