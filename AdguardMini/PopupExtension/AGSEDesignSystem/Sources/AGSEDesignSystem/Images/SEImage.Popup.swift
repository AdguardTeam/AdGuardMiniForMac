// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SEImage.Popup.swift
//  AGSEDesignSystem
//

import SwiftUI

// MARK: - SEImage.Popup

extension SEImage {
    enum Popup {
        private typealias Asset = ImageResource.Icons.Popup

        static let dislike = Image(Asset.dislike)
        static let safari = Image(Asset.safari)
        static let settings = Image(Asset.settings)
        static let star = Image(Asset.star)
        static let target = Image(Asset.target)
        static let webBrowsingSecurity = Image(Asset.webBrowsingSecurity)
        static let pause = Image(Asset.pause)
        static let attention = Image(Asset.attention)
        static let arrowRight = Image(Asset.arrowRight)
        static let quality = Image(Asset.quality)
    }
}

// MARK: - SEImagePopup_Previews

#Preview("Popup images") {
    HStack {
        SEImage.Popup.dislike
        SEImage.Popup.safari
        SEImage.Popup.settings
        SEImage.Popup.star
        SEImage.Popup.target
        SEImage.Popup.webBrowsingSecurity
        SEImage.Popup.pause
        SEImage.Popup.attention
        SEImage.Popup.arrowRight
        SEImage.Popup.quality
    }
    .padding(16)
}
