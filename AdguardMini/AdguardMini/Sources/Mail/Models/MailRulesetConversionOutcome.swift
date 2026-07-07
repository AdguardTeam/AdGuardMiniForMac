// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailRulesetConversionOutcome.swift
//  AdguardMini
//

// MARK: - MailRulesetConversionOutcome

/// Why a mail ruleset conversion run produced an empty or populated result.
enum MailRulesetConversionOutcome {
    /// Toggle on and Premium active: a non-empty, Mail-constrained ruleset.
    case populated
    /// Toggle off (takes precedence over Premium-inactive).
    case disabled
    /// Toggle on but Premium inactive.
    case nonPremium
}
