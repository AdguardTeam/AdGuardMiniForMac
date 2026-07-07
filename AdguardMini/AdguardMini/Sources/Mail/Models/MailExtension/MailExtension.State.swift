// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailExtension.State.swift
//  AdguardMini
//

import Foundation

extension MailExtension {
    /// Persisted state of the MailKit extension.
    struct State: Codable, Equatable {
        let rulesInfo: MailConversionInfo
        let status: Status
        let error: ExtensionError?

        init(
            rulesInfo: MailConversionInfo,
            status: Status = .unknown,
            error: ExtensionError? = nil
        ) {
            self.rulesInfo = rulesInfo
            self.status = status
            self.error = error
        }
    }
}

extension MailExtension.State {
    static var empty: Self {
        .init(
            rulesInfo: .empty,
            status: .unknown,
            error: nil
        )
    }
}
