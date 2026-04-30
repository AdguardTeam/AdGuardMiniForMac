// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Palette.Icon.swift
//  AGSEDesignSystem
//

import Foundation
import ColorPalette

extension Palette {
    enum Icon {
        static let productIcon = StatefulColor(
            enabledColor: Palette.strokeIconsProductIconDefault,
            disabledColor: Palette.strokeIconsProductIconDisabled,
            pressedColor: Palette.strokeIconsProductIconPressed,
            hoveredColor: Palette.strokeIconsProductIconHovered
        )

        static let errorIcon = StatefulColor(
            enabledColor: Palette.strokeIconsErrorIconDefault,
            disabledColor: Palette.strokeIconsErrorIconDisabled,
            pressedColor: Palette.strokeIconsErrorIconDefault,
            hoveredColor: Palette.strokeIconsErrorIconDefault
        )

        static let attentionIcon = StatefulColor(
            enabledColor: Palette.strokeIconsAttentionIconDefault,
            disabledColor: Palette.strokeIconsAttentionIconDisabled,
            pressedColor: Palette.strokeIconsAttentionIconDefault,
            hoveredColor: Palette.strokeIconsAttentionIconDefault
        )

        static let productTertiaryIcon = StatefulColor(
            enabledColor: Palette.strokeIconsProductTertiaryIconDefault,
            disabledColor: Palette.strokeIconsProductTertiaryIconDisabled,
            pressedColor: Palette.strokeIconsProductTertiaryIconDefault,
            hoveredColor: Palette.strokeIconsProductTertiaryIconDefault
        )
    }
}
