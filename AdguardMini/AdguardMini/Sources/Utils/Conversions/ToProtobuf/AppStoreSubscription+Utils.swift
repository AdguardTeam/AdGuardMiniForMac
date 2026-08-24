// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStoreSubscription+Utils.swift
//  AdguardMini
//

// Improve readability
// swiftlint:disable switch_case_on_newline

import Foundation
import ProtoSchema
import StoreKit

// MARK: - AppStore.Subscription.toProto

extension AppStore.Subscription {
    func toProto() -> AppStoreSubscription {
        switch self {
        case .monthly: .monthly
        case .annual:  .annual
        }
    }
}

// swiftlint:enable switch_case_on_newline
