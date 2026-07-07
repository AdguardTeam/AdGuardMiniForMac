// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailExtension.Status.swift
//  AdguardMini
//

import Foundation

extension MailExtension {
    /// Status of the MailKit content blocker extension.
    ///
    /// `Codable` because `State` persists a `status` value; `CaseIterable` lets
    /// tests assert the exact case set and the absence of `disabled`.
    enum Status: Codable, Equatable, CaseIterable {
        case unknown
        case ok
        case loading
        case limitExceeded
        case converterError
        case writeError

        /// Whether the extension is considered enabled for UI purposes.
        var isConsideredEnabled: Bool {
            switch self {
            case .ok, .loading, .limitExceeded, .converterError, .writeError:
                true
            case .unknown:
                false
            }
        }
    }
}
