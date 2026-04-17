// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Date+Utils.swift
//  AdguardMini
//

import Foundation

extension Date {
    /// Returns "elapsed: X.Xms" since `self`.
    func elapsedMs() -> String {
        "elapsed: \(String(format: "%.1f", Date().timeIntervalSince(self) * 1000))ms"
    }
}
