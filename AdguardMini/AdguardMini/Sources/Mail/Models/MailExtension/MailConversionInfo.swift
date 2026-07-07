// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailConversionInfo.swift
//  AdguardMini
//

import Foundation

/// Metrics from a mail ruleset generation run.
struct MailConversionInfo: Codable, Equatable {
    let sourceRulesCount: Int
    let jsonEntriesCount: Int
    let discardedRules: Int
    let errorsCount: Int

    var overLimit: Bool { self.discardedRules > 0 }
}

extension MailConversionInfo {
    static var empty: Self {
        .init(
            sourceRulesCount: 0,
            jsonEntriesCount: 0,
            discardedRules: 0,
            errorsCount: 0
        )
    }

    static var invalid: Self {
        .init(
            sourceRulesCount: -1,
            jsonEntriesCount: -1,
            discardedRules: -1,
            errorsCount: -1
        )
    }
}
