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

        HStack(spacing: Space.compact) {
            content.leftIcon
                .foregroundColor(
                    self.configuration.isEnabled
                    ? appearance.leftIconColor.enabledColor
                    : appearance.leftIconColor.disabledColor
                )
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
            Spacer()
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

struct PopupCell_Previews: PreviewProvider {
    static var previews: some View {
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
                        leftIconColor: Palette.Icon.productIcon
                    )
                )
            )
        }
        .frame(width: 320)
    }
}
