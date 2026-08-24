// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  OptionalError+Init.swift
//  AdguardMini
//

import ProtoSchema

extension OptionalError {
    static var noError: OptionalError {
        OptionalError(hasError: false)
    }

    static func error(_ message: String = "") -> OptionalError {
        OptionalError(hasError: true, message: message)
    }
}
