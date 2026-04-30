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

    static var backgroundColor: StatefulColor {
        StatefulColor(
            enabledColor: .clear,
            disabledColor: .clear,
            pressedColor: Palette.fillsButtonsSecondaryButtonPressed,
            hoveredColor: Palette.fillsButtonsSecondaryButtonHovered
        )
    }
}

// MARK: - PopupCellButton

struct PopupCellButton: View {
    // MARK: Public properties

    var isEnabled: Bool

    var title: String
    var leftIcon: Image

    var leftIconColor: StatefulColor
    var backgroundColor: StatefulColor = Constants.backgroundColor

    var action: () -> Void = {}

    // MARK: UI

    var body: some View {
        SEButton(
            configuration: .init(
                appearance: .init(
                    height: nil,
                    cornerRadius: Constants.cornerRadius,
                    backgroundColor: self.backgroundColor
                ),
                isEnabled: self.isEnabled
            ),
            action: self.action
        ) {
            PopupCell(
                configuration: .primary(
                    content: .init(
                        title: self.title,
                        leftIcon: self.leftIcon
                    ),
                    leftIconColor: self.leftIconColor,
                    isEnabled: self.isEnabled
                )
            )
        }
        .disabled(!self.isEnabled)
    }
}

// MARK: - PopupCellButton_Previews

struct PopupCellButton_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 8) {
            PopupCellButton(
                isEnabled: true,
                title: "Block element",
                leftIcon: SEImage.Popup.target,
                leftIconColor: Palette.Icon.errorIcon,
                backgroundColor: Constants.backgroundColor
            )

            PopupCellButton(
                isEnabled: false,
                title: "Block element",
                leftIcon: SEImage.Popup.target,
                leftIconColor: Palette.Icon.errorIcon,
                backgroundColor: Constants.backgroundColor
            )

            PopupCellButton(
                isEnabled: true,
                title: "Report an issue",
                leftIcon: SEImage.Popup.dislike,
                leftIconColor: Palette.Icon.productTertiaryIcon,
                backgroundColor: Constants.backgroundColor
            )

            PopupCellButton(
                isEnabled: false,
                title: "Report an issue",
                leftIcon: SEImage.Popup.dislike,
                leftIconColor: Palette.Icon.productTertiaryIcon,
                backgroundColor: Constants.backgroundColor
            )
        }
        .frame(width: 320)
    }
}
