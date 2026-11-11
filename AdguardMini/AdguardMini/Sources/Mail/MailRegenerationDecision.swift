// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailRegenerationDecision.swift
//  AdguardMini
//

import Foundation

/// Whether a filter update should trigger mail regeneration.
/// The Mail ruleset is built from the mail filter and the user-rules filter.
enum MailRegenerationDecision {
    static func includesMailFilter(_ filterIds: [Int], userRulesFilterId: Int) -> Bool {
        filterIds.contains(AdGuardAdditionalFilterId.mailTrackingProtection)
            || filterIds.contains(userRulesFilterId)
    }
}
