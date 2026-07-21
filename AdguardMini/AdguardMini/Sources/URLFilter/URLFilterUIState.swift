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
/// `URLFilterState` by an app-target-only `toProto()` extension. Keeping this
/// type free of any sciter dependency lets the assembly logic be unit-tested
/// without linking `SciterSchema`.
struct URLFilterUIState: Equatable {
    /// Derived URL filter status.
    var status: URLFilterStatus
    /// Whether the filter is currently enabled.
    var enabled: Bool
    /// Selected protection level.
    var protectionLevel: URLFilterProtectionLevel
    /// Read-only metadata.
    var info: URLFilterInfo
    /// Error text derived from ``status``, if any.
    var errorMessage: String?
}
