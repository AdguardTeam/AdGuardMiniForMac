// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupCellButton.swift
//  AGSEDesignSystem
//

import SwiftUI
import ColorPalette

// MARK: - UI constants

private enum Constants {
    static var cornerRadius: CGFloat = 0

    static var defaultBackgroundColor: StatefulColor {
        StatefulColor(
            enabledColor: .clear,
            disabledColor: .clear,
            pressedColor: Palette.fillsButtonsSecondaryButtonPressed,
            hoveredColor: Palette.fillsButtonsSecondaryButtonHovered
        )
    }
}

// MARK: - PopupCellButton

/// A button that wraps a `PopupCell` with hover/pressed effects.
/// The cell style is determined by the `configuration` parameter.
struct PopupCellButton: View {
    // MARK: Public properties

    var configuration: PopupCell.Configuration
    var action: () -> Void

    // MARK: Init

    init(
        configuration: PopupCell.Configuration,
        action: @escaping () -> Void = {}
    ) {
        self.configuration = configuration
        self.action = action
    }

    // MARK: UI

    var body: some View {
        SEButton(
            configuration: .init(
                appearance: .init(
                    height: nil,
                    cornerRadius: Constants.cornerRadius,
                    backgroundColor: self.configuration.appearance.backgroundColor
                        ?? Constants.defaultBackgroundColor
                ),
                isEnabled: self.configuration.isEnabled
            ),
            action: self.action
        ) {
            PopupCell(configuration: self.configuration)
        }
        .disabled(!self.configuration.isEnabled)
    }
}

// MARK: - PopupCellButton_Previews

#Preview {
    VStack(spacing: 8) {
        PopupCellButton(
            configuration: .primary(
                content: .init(
                    title: "Block element",
                    leftIcon: SEImage.Popup.target
                ),
                leftIconColor: Palette.Icon.errorIcon,
                isEnabled: true
            )
        )

        PopupCellButton(
            configuration: .primary(
                content: .init(
                    title: "Block element",
                    leftIcon: SEImage.Popup.target
                ),
                leftIconColor: Palette.Icon.errorIcon,
                isEnabled: false
            )
        )

        PopupCellButton(
            configuration: .primary(
                content: .init(
                    title: "Report an issue",
                    leftIcon: SEImage.Popup.dislike
                ),
                leftIconColor: Palette.Icon.productTertiaryIcon,
                isEnabled: true
            )
        )

        PopupCellButton(
            configuration: .primary(
                content: .init(
                    title: "Report an issue",
                    leftIcon: SEImage.Popup.dislike
                ),
                leftIconColor: Palette.Icon.productTertiaryIcon,
                isEnabled: false
            )
        )

        PopupCellButton(
            configuration: .primary(
                content: .init(
                    title: "Still seeing ads? Learn how to fix this",
                    leftIcon: SEImage.Popup.attention,
                    rightIcon: SEImage.Popup.arrowRight
                ),
                leftIconColor: Palette.Icon.attentionIcon,
                rightIconColor: Palette.Icon.grayIcon,
                titleColor: Palette.Text.attention,
                isMultilineTitle: true,
                isEnabled: true
            )
        )

        PopupCellButton(
            configuration: .primary(
                content: .init(
                    title: "Still seeing ads? Learn how to fix this",
                    leftIcon: SEImage.Popup.attention,
                    rightIcon: SEImage.Popup.arrowRight
                ),
                leftIconColor: Palette.Icon.attentionIcon,
                rightIconColor: Palette.Icon.grayIcon,
                titleColor: Palette.Text.attention,
                isMultilineTitle: true,
                isEnabled: false
            )
        )
    }
    .frame(width: 320)
}
