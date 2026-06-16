// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupCell.swift
//  AGSEDesignSystem
//

import SwiftUI
import ColorPalette

// MARK: - PopupCell

struct PopupCell: View {
    // MARK: Private properties

    private let titleAccessibilityHidden: Bool = false

    // MARK: Public properties

    var configuration: Configuration

    // MARK: UI

    var body: some View {
        VStack(spacing: Space.tiny) {
            self.mainBody
            self.subtitleBody
        }
        .padding(self.configuration.appearance.paddings)
    }

    @ViewBuilder
    var mainBody: some View {
        let content = self.configuration.content
        let appearance = self.configuration.appearance

        HStack(alignment: .top, spacing: Space.regular) {
            HStack(alignment: .center, spacing: Space.compact) {
                content.leftIcon
                    .foregroundColor(
                        self.configuration.isEnabled
                        ? appearance.leftIconColor.enabledColor
                        : appearance.leftIconColor.disabledColor
                    )
                    .frame(maxHeight: .infinity, alignment: .top)
                    .accessibility(hidden: true)
                Text(content.title)
                    .foregroundColor(
                        self.configuration.isEnabled
                        ? appearance.titleConfiguration.color.enabledColor
                        : appearance.titleConfiguration.color.disabledColor
                    )
                    .textStyle(appearance.titleConfiguration)
                    .accessibility(hint: Text(content.subtitleLines.joined(separator: "\n")))
                    .accessibility(hidden: self.titleAccessibilityHidden)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Spacer()
            if let rightIcon = content.rightIcon, let rightIconColor = appearance.rightIconColor {
                rightIcon
                    .foregroundColor(
                        self.configuration.isEnabled
                        ? rightIconColor.enabledColor
                        : rightIconColor.disabledColor
                    )
                    .accessibility(hidden: true)
            }
        }
    }

    @ViewBuilder
    private var subtitleBody: some View {
        if !self.configuration.content.subtitleLines.isEmpty,
           let subtitleConfig = self.configuration.appearance.subtitleConfiguration {
            VStack(alignment: .leading, spacing: Space.tiny) {
                ForEach(self.configuration.content.subtitleLines, id: \.self) { line in
                    Text(line)
                        .textStyle(subtitleConfig)
                        .accessibility(hidden: true)
                }
            }
            .padding(.leading, Margin.extraLarge)
        }
    }
}

#Preview {
    VStack {
        PopupCell(
            configuration: .init(
                content: .init(
                    title: "fonts.google.com",
                    subtitleLines: ["Protection is off for this website as it may interfere with its operation"],
                    leftIcon: SEImage.Popup.webBrowsingSecurity
                ),
                appearance: .init(
                    titleConfiguration: .domain(),
                    subtitleConfiguration: .subtitle(
                        alignment: .leading,
                        multilineTextAlignment: .leading
                    ),
                    leftIconColor: Palette.Icon.productIcon,
                    paddings: EdgeInsets(side: Margin.regular)
                )
            )
        )

        PopupCell(
            configuration: .primary(
                content: .init(
                    title: "Block element",
                    leftIcon: SEImage.Popup.target
                ),
                leftIconColor: Palette.Icon.errorIcon,
                isMultilineTitle: true,
                isEnabled: true
            )
        )

        PopupCell(
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
    }
    .frame(width: 320)
}
