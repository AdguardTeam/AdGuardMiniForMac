// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterConfigurationDTO.swift
//  AdguardMini
//

import Foundation

/// UI-submitted URL filter configuration expressed in pure Swift types.
///
/// Converted from the Protobuf `URLFilterConfiguration` message by a
/// `FromProtobuf` extension. Unlike the service-level
/// ``URLFilterConfiguration`` it carries only the fields the UI can edit,
/// keeping `prefilterFetchInterval`/`shouldFailClosed` out of the wire format.
struct URLFilterConfigurationDTO: Equatable {
    /// Whether the filter should be enabled.
    var enabled: Bool
    /// Selected protection level.
    var protectionLevel: URLFilterProtectionLevel
}
