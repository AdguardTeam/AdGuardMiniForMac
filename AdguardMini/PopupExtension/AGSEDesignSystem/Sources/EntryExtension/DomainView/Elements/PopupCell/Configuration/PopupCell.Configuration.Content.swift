// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupCell.Configuration.Content.swift
//  AGSEDesignSystem
//

import SwiftUI

extension PopupCell.Configuration {
    struct Content {
        var title: String
        var subtitleLines: [String] = []
        var leftIcon: Image

        init(
            title: String,
            subtitleLines: [String] = [],
            leftIcon: Image
        ) {
            self.title = title
            self.subtitleLines = subtitleLines
            self.leftIcon = leftIcon
        }
    }
}
