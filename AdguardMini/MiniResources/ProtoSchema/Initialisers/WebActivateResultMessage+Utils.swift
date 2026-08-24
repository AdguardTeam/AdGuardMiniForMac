// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebActivateResultMessage+Utils.swift
//  ProtoSchema
//

extension WebActivateResultMessage {
    public init(
        result: WebActivateResult = .unknown,
        error: OptionalError = OptionalError()
    ) {
        self.init()
        self.result = result
        self.error = error
    }
}
