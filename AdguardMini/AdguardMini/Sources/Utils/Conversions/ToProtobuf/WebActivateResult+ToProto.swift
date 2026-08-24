// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebActivateResult+ToProto.swift
//  AdguardMini
//

import ProtoSchema

// swiftlint:disable switch_case_on_newline

extension WebActivateResult {
    func toProto() -> ProtoSchema.WebActivateResult {
        switch self {
        case .cancelled:                .cancelled
        case .userRedirectedToPurchase: .userRedirectedToPurchase
        case .success:                  .success
        }
    }
}

// swiftlint:enable switch_case_on_newline
