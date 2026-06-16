// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Palette.Button.swift
//  AGSEDesignSystem
//

import SwiftUI
import ColorPalette

extension Palette {
    enum PrimaryButton {
        enum Main {
            static let background = StatefulColor(
                enabledColor: Palette.fillsButtonsMainButtonDefault,
                disabledColor: Palette.fillsButtonsMainButtonDisabled,
                pressedColor: Palette.fillsButtonsMainButtonPressed,
                hoveredColor: Palette.fillsButtonsMainButtonHovered
            )

            static let font = PrimaryButton.font
        }

        enum Attention {
            static let background = StatefulColor(
                enabledColor: Palette.fillsButtonsAttentionButtonDefault,
                disabledColor: Palette.fillsButtonsAttentionButtonDisabled,
                pressedColor: Palette.fillsButtonsAttentionButtonPressed,
                hoveredColor: Palette.fillsButtonsAttentionButtonHovered
            )

            static let font = PrimaryButton.font
        }

        enum Footer {
            static let background = StatefulColor(
                enabledColor: Palette.fillsBackgroundsFooterDefault,
                disabledColor: Palette.fillsBackgroundsFooterDefault,
                pressedColor: Palette.fillsBackgroundsFooterDefault,
                hoveredColor: Palette.fillsBackgroundsFooterDefault
            )

            static let font = PrimaryButton.font
        }

        static let font = StatefulColor(
            enabledColor: Palette.textButtonsPrimaryDefault,
            disabledColor: Palette.textButtonsPrimaryDisabled,
            pressedColor: Palette.textButtonsPrimaryDefault,
            hoveredColor: Palette.textButtonsPrimaryDefault
        )
    }

    enum SwitchButton {
        static let onBackground = StatefulColor(
            enabledColor: Palette.fillsSwitchAllOnDefault,
            disabledColor: Palette.fillsSwitchAllOnDisabled,
            pressedColor: Palette.fillsSwitchAllOnDefault,
            hoveredColor: Palette.fillsSwitchAllOnHovered
        )
        static let offBackground = StatefulColor(
            enabledColor: Palette.fillsSwitchAllOffDefault,
            disabledColor: Palette.fillsSwitchAllOffDisabled,
            pressedColor: Palette.fillsSwitchAllOffDefault,
            hoveredColor: Palette.fillsSwitchAllOffHovered
        )
        static let onInactiveBackground = StatefulColor(
            enabledColor: Palette.fillsSwitchAllOnDefaultInactive,
            disabledColor: Palette.fillsSwitchAllOnDisabledInactive,
            pressedColor: Palette.fillsSwitchAllOnDefaultInactive,
            hoveredColor: Palette.fillsSwitchAllOnHoveredInactive
        )
        static let offInactiveBackground = StatefulColor(
            enabledColor: Palette.fillsSwitchAllOffDefaultInactive,
            disabledColor: Palette.fillsSwitchAllOffDisabledInactive,
            pressedColor: Palette.fillsSwitchAllOffDefaultInactive,
            hoveredColor: Palette.fillsSwitchAllOffHoveredInactive
        )

        static let circle = StatefulColor(
            enabledColor: Palette.fillsSwitchAllKnobDefault,
            disabledColor: Palette.fillsSwitchAllKnobDisabled,
            pressedColor: Palette.fillsSwitchAllKnobDefault,
            hoveredColor: Palette.fillsSwitchAllKnobDefault
        )
    }
}
