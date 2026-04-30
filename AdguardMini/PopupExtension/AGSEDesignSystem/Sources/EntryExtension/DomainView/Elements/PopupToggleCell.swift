// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupToggleCell.swift
//  AGSEDesignSystem
//

import SwiftUI
import ColorPalette

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

// MARK: - PopupToggleCell

struct PopupToggleCell: View {
    // MARK: Public properties

    @Binding var isOn: Bool

    var configuration: PopupCell.Configuration

    // MARK: UI

    var body: some View {
        let content = self.configuration.content
        let appearance = self.configuration.appearance

        SEButton(
            configuration: .init(
                appearance: .init(
                    height: nil,
                    cornerRadius: Constants.cornerRadius,
                    backgroundColor: Constants.backgroundColor
                ),
                isEnabled: self.configuration.isEnabled
            ),
            action: { self.isOn.toggle() }
        ) {
            HStack(alignment: .top, spacing: Space.compact) {
                PopupCell(
                    configuration: .init(
                        content: .init(
                            title: content.title,
                            subtitleLines: content.subtitleLines,
                            leftIcon: content.leftIcon
                        ),
                        appearance: appearance.updatingPaddings(EdgeInsets()),
                        isEnabled: self.configuration.isEnabled
                    )
                )
                SEToggle(
                    isOn: self.$isOn,
                    configuration: .primary(
                        isEnabled: self.configuration.isEnabled
                    )
                )
            }
            .padding(self.configuration.appearance.paddings)
            .allowsHitTesting(false)
        }
        .accessibility(hint: Text(content.title))
    }
}

// MARK: - PopupCell.Configuration.Appearance + updatingPaddings

fileprivate extension PopupCell.Configuration.Appearance {
    func updatingPaddings(_ newPaddings: EdgeInsets) -> Self {
        Self(
            titleConfiguration: self.titleConfiguration,
            subtitleConfiguration: self.subtitleConfiguration,
            leftIconColor: self.leftIconColor,
            paddings: newPaddings
        )
    }
}

// MARK: - PopupToggleCell_Previews

struct PopupToggleCell_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 16) {
            self.protectionOnVariants
            self.protectionOffVariants
        }
        .frame(width: 320)
    }

    @ViewBuilder
    private static var protectionOnVariants: some View {
        VStack(spacing: 8) {
            PopupToggleCell(
                isOn: .constant(true),
                configuration: .init(
                    content: .init(
                        title: "Protection",
                        leftIcon: SEImage.Popup.safari
                    ),
                    appearance: .init(
                        titleConfiguration: .domain(),
                        subtitleConfiguration: .subtitle(
                            alignment: .leading,
                            multilineTextAlignment: .leading
                        ),
                        leftIconColor: Palette.PrimaryButton.Main.background
                    )
                )
            )

            PopupToggleCell(
                isOn: .constant(true),
                configuration: .init(
                    content: .init(
                        title: "Protection",
                        leftIcon: SEImage.Popup.safari
                    ),
                    appearance: .init(
                        titleConfiguration: .domain(),
                        subtitleConfiguration: .subtitle(
                            alignment: .leading,
                            multilineTextAlignment: .leading
                        ),
                        leftIconColor: Palette.Icon.productIcon
                    ),
                    isEnabled: false
                )
            )
        }
    }

    @ViewBuilder
    private static var protectionOffVariants: some View {
        VStack(spacing: 8) {
            PopupToggleCell(
                isOn: .constant(false),
                configuration: .init(
                    content: .init(
                        title: "Protection",
                        leftIcon: SEImage.Popup.safari
                    ),
                    appearance: .init(
                        titleConfiguration: .domain(),
                        subtitleConfiguration: .subtitle(
                            alignment: .leading,
                            multilineTextAlignment: .leading
                        ),
                        leftIconColor: Palette.Icon.productIcon
                    )
                )
            )

            PopupToggleCell(
                isOn: .constant(false),
                configuration: .init(
                    content: .init(
                        title: "Protection",
                        leftIcon: SEImage.Popup.safari
                    ),
                    appearance: .init(
                        titleConfiguration: .domain(),
                        subtitleConfiguration: .subtitle(
                            alignment: .leading,
                            multilineTextAlignment: .leading
                        ),
                        leftIconColor: Palette.Icon.productIcon
                    ),
                    isEnabled: false
                )
            )
        }
    }
}
