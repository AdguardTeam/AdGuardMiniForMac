// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Theme+ToProto.swift
//  AdguardMini
//

import ProtoSchema

extension Theme {
    func toProto() -> ProtoSchema.Theme {
        switch self {
        case .system: .system
        case .light:  .light
        case .dark:   .dark
        }
    }
}
