// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailRegenerationDecision.swift
//  AdguardMini
//

import Foundation

/// Whether a filter update should trigger mail regeneration.
/// Only filter 25 (Mail Tracking Protection) affects mail.
enum MailRegenerationDecision {
    private static let mailTrackingProtectionFilterId = 25

    static func includesMailFilter(_ filterIds: [Int]) -> Bool {
        filterIds.contains(Self.mailTrackingProtectionFilterId)
    }
}
