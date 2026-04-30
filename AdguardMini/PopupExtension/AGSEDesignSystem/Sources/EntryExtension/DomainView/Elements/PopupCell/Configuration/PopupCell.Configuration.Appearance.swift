// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupCell.Configuration.Appearance.swift
//  AGSEDesignSystem
//

import SwiftUI

extension PopupCell.Configuration {
    struct Appearance {
        var titleConfiguration: Text.Configuration
        var subtitleConfiguration: Text.Configuration?
        var leftIconColor: StatefulColor
        var paddings: EdgeInsets

        init(
            titleConfiguration: Text.Configuration,
            subtitleConfiguration: Text.Configuration? = nil,
            leftIconColor: StatefulColor,
            paddings: EdgeInsets = EdgeInsets(
                top: Margin.small,
                leading: Margin.regular,
                bottom: Margin.small,
                trailing: Margin.regular
            )
        ) {
            self.titleConfiguration = titleConfiguration
            self.subtitleConfiguration = subtitleConfiguration
            self.leftIconColor = leftIconColor
            self.paddings = paddings
        }
    }
}
