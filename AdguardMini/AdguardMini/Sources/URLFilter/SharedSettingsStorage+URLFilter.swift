// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SharedSettingsStorage+URLFilter.swift
//  AdguardMini
//

import Foundation

// MARK: - SharedKeychainStorage + URLFilter

extension SharedKeychainStorage {
    /// Convenience accessor that wraps the raw Int storage value into
    /// a typed ``URLFilterProtectionLevel``.
    var urlFilterProtectionLevel: URLFilterProtectionLevel {
        get { URLFilterProtectionLevel(rawValue: self.urlFilterProtectionLevelOption) ?? .essential }
        set { self.urlFilterProtectionLevelOption = newValue.rawValue }
    }
}
