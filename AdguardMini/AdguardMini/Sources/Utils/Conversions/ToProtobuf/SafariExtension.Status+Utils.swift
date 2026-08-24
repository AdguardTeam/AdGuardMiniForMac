// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ExtensionStatus+Utils.swift
//  AdguardMini
//

// swiftlint:disable switch_case_on_newline

import ProtoSchema

extension SafariExtension.Status {
    func toProto() -> SafariExtensionStatus {
        switch self {
        case .unknown:        .unknown
        case .ok:             .ok
        case .loading:        .loading
        case .disabled:       .disabled
        case .limitExceeded:  .limitExceeded
        case .converterError: .converterError
        case .safariError:    .safariError
        }
    }
}

// swiftlint:enable switch_case_on_newline
