// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Text.Configuration.Styles.swift
//  AGSEDesignSystem
//

import SwiftUI
import ColorPalette

// MARK: - Text.Configuration.Styles

extension Text.Configuration {
    // MARK: Domain

    static func domain(
        isMultiline: Bool = false
    ) -> Self {
        .init(
            font: Typography.Style.domain.font,
            color: Palette.Text.mainText,
            isMultiline: isMultiline,
            alignment: .leading,
            multilineTextAlignment: .center
        )
    }

    // MARK: PopupCell

    static func popupCell(
        color: StatefulColor = Palette.Text.mainText,
        isMultiline: Bool = false
    ) -> Self {
        .init(
            font: Typography.Style.t2CondensedRegular.font,
            color: color,
            isMultiline: isMultiline
        )
    }

    // MARK: Title

    static func title(
        isMultiline: Bool = true
    ) -> Self {
        .init(
            font: Typography.Style.h4.font,
            color: Palette.Text.mainText,
            isMultiline: isMultiline
        )
    }

    // MARK: Subtitle

    static func subtitle(
        isMultiline: Bool = true,
        alignment: Alignment = .center,
        multilineTextAlignment: TextAlignment = .center
    ) -> Self {
        .init(
            font: Typography.Style.t2CondensedRegular.font,
            color: Palette.Text.description,
            isMultiline: isMultiline,
            alignment: alignment,
            multilineTextAlignment: multilineTextAlignment
        )
    }
}

// MARK: - TextConfigurationStyles_Previews

struct TextConfigurationStyles_Previews: PreviewProvider {
    static var previews: some View {
        VStack {
            self.domainStyle
            self.popupCellStyle
            self.titleStyle
            self.subtitleStyle
        }
        .frame(width: 320)
        .padding()
    }

    @ViewBuilder
    private static var domainStyle: some View {
        VStack {
            Text("DomainSL: The quick brown fox jumps over the lazy dog.")
                .textStyle(.domain())
            Divider()
            Text("DomainML: The quick brown fox jumps over the lazy dog.")
                .textStyle(.domain(isMultiline: true))
        }
        .padding(4)
    }

    @ViewBuilder
    private static var popupCellStyle: some View {
        VStack {
            Text("PopupCellSL: The quick brown fox jumps over the lazy dog.")
                .textStyle(.popupCell())
            Divider()
            Text("PopupCellML: The quick brown fox jumps over the lazy dog.")
                .textStyle(.popupCell(isMultiline: true))
        }
        .padding(4)
    }

    @ViewBuilder
    private static var titleStyle: some View {
        VStack {
            Text("TitleSL: The quick brown fox jumps over the lazy dog.")
                .textStyle(.title(isMultiline: false))
            Divider()
            Text("TitleML: The quick brown fox jumps over the lazy dog.")
                .textStyle(.title())
        }
        .padding(4)
    }

    @ViewBuilder
    private static var subtitleStyle: some View {
        VStack {
            Text("SubtitleSL: The quick brown fox jumps over the lazy dog.")
                .textStyle(.subtitle(isMultiline: false))
            Divider()
            Text("SubtitleML: The quick brown fox jumps over the lazy dog.")
                .textStyle(.subtitle())
        }
        .padding(4)
    }
}
