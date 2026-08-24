// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  EnterActivationCodeResultMessage+Utils.swift
//  ProtoSchema
//

extension EnterActivationCodeResultMessage {
    public init(
        result: EnterActivationCodeResult = .notExists,
        error: OptionalError = OptionalError()
    ) {
        self.init()
        self.result = result
        self.error = error
    }
}
