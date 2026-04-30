// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupCell.Configuration.Primary.swift
//  AGSEDesignSystem
//

import SwiftUI
import ColorPalette

extension PopupCell.Configuration {
    static func primary(
        content: Content,
        leftIconColor: StatefulColor,
        isEnabled: Bool
    ) -> Self {
        .init(
            content: content,
            appearance: .init(
                titleConfiguration: .popupCell(),
                subtitleConfiguration: .subtitle(
                    alignment: .leading,
                    multilineTextAlignment: .leading
                ),
                leftIconColor: leftIconColor
            ),
            isEnabled: isEnabled
        )
    }
}

#Preview("Primary cell") {
    func makeContent(
        subtitleLines: [String] = []
    ) -> PopupCell.Configuration.Content {
        .init(
            title: "Block element",
            subtitleLines: subtitleLines,
            leftIcon: SEImage.Popup.target
        )
    }

    let baseContent = makeContent()
    let hintText = "Protection is off for this website as it may interfere with its operation"
    let fullContent = makeContent(subtitleLines: [hintText])

    return VStack(spacing: 16) {
        PopupCell(
            configuration: .primary(
                content: baseContent,
                leftIconColor: Palette.Icon.errorIcon,
                isEnabled: true
            )
        )
        .border(Color.accentColor)

        PopupCell(
            configuration: .primary(
                content: baseContent,
                leftIconColor: Palette.Icon.errorIcon,
                isEnabled: false
            )
        )
        .border(Color.accentColor)

        PopupCell(
            configuration: .primary(
                content: fullContent,
                leftIconColor: Palette.Icon.errorIcon,
                isEnabled: true
            )
        )
        .border(Color.accentColor)

        PopupCell(
            configuration: .primary(
                content: fullContent,
                leftIconColor: Palette.Icon.errorIcon,
                isEnabled: false
            )
        )
        .border(Color.accentColor)
    }
    .frame(width: 320)
}
