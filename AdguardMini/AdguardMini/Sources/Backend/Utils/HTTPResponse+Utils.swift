// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  HTTPResponse+Utils.swift
//  AdguardMini
//

import AML
import AppBackend

extension HTTPResponse {
    /// Validates the response status code and the X-Request-Key header.
    /// - Parameters:
    ///   - request: The request whose X-Request-Key is validated; the validation is skipped when it is `nil`.
    ///   - action: The action name used in the log line.
    /// - Throws: `BackendError.badHttpCode` for a non-success status code, or `BackendError.wrongXRequestKey`.
    func check(of request: BackendRequest? = nil, action: String) throws {
        guard self.isSuccessful else {
            LogError("Http Error when \(action). Http Status: \(self.statusCode). Body: \(String(decoding: self.data, as: Unicode.UTF8.self))")
            LogErrorTrace()
            throw BackendError.badHttpCode(self.statusCode)
        }

        guard request?.checkResponse(self) ?? true else {
            LogError("Error \(action): Wrong X-Request-Key from server")
            LogErrorTrace()
            throw BackendError.wrongXRequestKey
        }
    }
}
