// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  QuitReaction+Utils.swift
//  AdguardMini
//

// swiftlint:disable switch_case_on_newline

import Foundation
import ProtoSchema

extension QuitReaction {
    func toProto() -> ProtoSchema.QuitReaction {
        switch self {
        case .ask:          .ask
        case .keepRunning:  .keepRunning
        case .quit:         .quit
        }
    }
}

// swiftlint:enable switch_case_on_newline
