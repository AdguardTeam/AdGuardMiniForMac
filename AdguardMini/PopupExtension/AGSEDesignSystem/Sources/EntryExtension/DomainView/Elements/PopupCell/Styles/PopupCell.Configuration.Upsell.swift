// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupCell.Configuration.Upsell.swift
//  AGSEDesignSystem
//

import SwiftUI
import ColorPalette

extension PopupCell.Configuration {
    /// CTA-style cell for upsell prompts.
    /// White text on dark background with product-colored left icon.
    static func upsell(
        content: Content,
        leftIconColor: StatefulColor = Palette.Icon.productIcon,
        rightIconColor: StatefulColor = Palette.Icon.grayIcon,
        isEnabled: Bool = true
    ) -> Self {
        .init(
            content: content,
            appearance: .init(
                titleConfiguration: .init(
                    typographyStyle: .t1CondensedRegular,
                    color: Palette.PrimaryButton.font,
                    isMultiline: false,
                    alignment: .leading,
                    multilineTextAlignment: .leading
                ),
                subtitleConfiguration: .subtitle(
                    color: Palette.PrimaryButton.font,
                    alignment: .leading,
                    multilineTextAlignment: .leading
                ),
                leftIconColor: leftIconColor,
                rightIconColor: rightIconColor,
                backgroundColor: Palette.PrimaryButton.Footer.background,
                paddings: EdgeInsets(
                    top: Margin.regular,
                    leading: Margin.regular,
                    bottom: Margin.expanded,
                    trailing: Margin.regular
                )
            ),
            isEnabled: isEnabled
        )
    }
}

#Preview("Upsell cell") {
    VStack(spacing: 16) {
        PopupCell(
            configuration: .upsell(
                content: .init(
                    title: "Unlock full protection",
                    subtitleLines: ["Try 14 days for free"],
                    leftIcon: SEImage.Popup.quality,
                    rightIcon: SEImage.Popup.arrowRight
                )
            )
        )
        .border(Color.accentColor)

        PopupCell(
            configuration: .upsell(
                content: .init(
                    title: "Unlock full protection",
                    subtitleLines: ["Try 14 days for free"],
                    leftIcon: SEImage.Popup.quality,
                    rightIcon: SEImage.Popup.arrowRight
                ),
                isEnabled: false
            )
        )
        .border(Color.accentColor)
    }
    .frame(width: 320)
    .padding()
}
