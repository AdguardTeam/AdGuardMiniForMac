// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AppStoreSubscription+FromProto.swift
//  AdguardMini
//

import StoreKit

import ProtoSchema
import AML

extension AppStoreSubscription {
    func toPlatform() -> AppStore.Subscription {
        let unrecognisedHandler: (Int) -> AppStore.Subscription = { rawValue in
            LogDebug("Unknown subscription type: \(rawValue). Switch to annual")
            return .annual
        }

        return switch self {
        // Improve readability
        // swiftlint:disable switch_case_on_newline
        case .monthly:                 .monthly
        case .annual:                  .annual
        case .UNRECOGNIZED(let value): unrecognisedHandler(value)
        // swiftlint:enable switch_case_on_newline
        }
    }
}
