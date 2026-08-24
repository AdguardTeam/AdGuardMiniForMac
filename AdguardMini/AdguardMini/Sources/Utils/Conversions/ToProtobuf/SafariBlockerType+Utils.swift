// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariBlockerType+Utils.swift
//  AdguardMini
//

import ProtoSchema

extension SafariBlockerType {
    // swiftlint:disable switch_case_on_newline
    func toProto() -> SafariExtensionType {
        switch self {
        case .general:                    .general
        case .privacy:                    .privacy
        case .security:                   .security
        case .socialWidgetsAndAnnoyances: .social
        case .other:                      .other
        case .custom:                     .custom
        case .advanced:                   .adguardForSafari
        }
    }
    // swiftlint:enable switch_case_on_newline
}
