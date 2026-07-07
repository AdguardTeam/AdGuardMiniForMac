// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailExtension.State.ExtensionError.swift
//  AdguardMini
//

import Foundation

extension MailExtension.State {
    /// Error that can occur during mail ruleset generation or writing.
    enum ExtensionError: Error, Codable, Equatable {
        case converterError
        case writeError(String?)
    }
}

extension MailExtension.State.ExtensionError {
    var message: String? {
        switch self {
        case .converterError:
            nil
        case .writeError(let message):
            message
        }
    }
}
