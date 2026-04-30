// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupCell.Configuration.Attention.swift
//  AGSEDesignSystem
//

import SwiftUI
import ColorPalette

extension PopupCell.Configuration {
    static func attention(
        title: String,
        isEnabled: Bool
    ) -> Self {
        .init(
            content: .init(title: title, leftIcon: SEImage.Popup.attention),
            appearance: .init(
                titleConfiguration: .popupCell(color: Palette.Text.attention),
                subtitleConfiguration: .subtitle(),
                leftIconColor: Palette.Icon.attentionIcon
            ),
            isEnabled: isEnabled
        )
    }
}

#Preview("Attention cell") {
    let title = "Some extensions are off"

    return VStack(spacing: 16) {
        PopupCell(
            configuration: .attention(
                title: title,
                isEnabled: true
            )
        )
        .border(Color.accentColor)

        PopupCell(
            configuration: .attention(
                title: title,
                isEnabled: false
            )
        )
        .border(Color.accentColor)
    }
    .frame(width: 320)
}
