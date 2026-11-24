// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ApplicationKeyStatus+ToProto.swift
//  AdguardMini
//

import AppBackend
import ProtoSchema

extension ApplicationKeyStatus {
    func toProto() -> EnterActivationCodeResult {
        // Improve readability
        // swiftlint:disable switch_case_on_newline
        switch self {
        case .notExists:          .notExists
        case .expired:            .expired
        case .maxComputersExceed: .maxComputersExceed
        case .blocked:            .blocked
        case .valid:              .valid
        }
        // swiftlint:enable switch_case_on_newline
    }
}
