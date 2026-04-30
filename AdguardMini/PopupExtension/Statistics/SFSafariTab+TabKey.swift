// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SFSafariTab+TabKey.swift
//  PopupExtension
//

import SafariServices

extension SFSafariTab {
    /// Produces a stable string key for this tab by archiving the object
    /// with `NSKeyedArchiver`. The result is a Base64-encoded string that
    /// uniquely identifies the tab instance.
    func tabKey() -> String? {
        guard let data = try? NSKeyedArchiver.archivedData(
            withRootObject: self,
            requiringSecureCoding: true
        ) else {
            return nil
        }
        return data.base64EncodedString()
    }
}
