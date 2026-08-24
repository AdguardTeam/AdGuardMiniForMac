// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Settings+Utils.swift
//  AdguardMini
//

import Foundation
import ProtoSchema

extension ProtoSchema.QuitReaction {
    func toQuitReaction() -> QuitReaction {
        switch self {
        case .ask:                    .ask
        case .keepRunning:            .keepRunning
        case .quit:                   .quit
        case .UNRECOGNIZED, .unknown: .ask
        }
    }
}

extension ProtoSchema.Theme {
    func toTheme() -> Theme {
        switch self {
        case .system:                 .system
        case .light:                  .light
        case .dark:                   .dark
        case .UNRECOGNIZED, .unknown: .system
        }
    }
}
