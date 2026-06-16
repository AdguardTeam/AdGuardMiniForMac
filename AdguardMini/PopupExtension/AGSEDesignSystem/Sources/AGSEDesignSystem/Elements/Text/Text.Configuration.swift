// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SEText.swift
//  AGSEDesignSystem
//

import SwiftUI

extension Text {
    struct Configuration {
        var typographyStyle: Typography.Style
        var color: StatefulColor
        var isMultiline: Bool
        var alignment: Alignment
        var multilineTextAlignment: TextAlignment

        var font: Font { typographyStyle.font }
        var fontSize: CGFloat { typographyStyle.fontSize }

        init(
            typographyStyle: Typography.Style,
            color: StatefulColor,
            isMultiline: Bool,
            alignment: Alignment = .center,
            multilineTextAlignment: TextAlignment = .center
        ) {
            self.typographyStyle = typographyStyle
            self.color = color
            self.isMultiline = isMultiline
            self.alignment = alignment
            self.multilineTextAlignment = multilineTextAlignment
        }
    }
}
