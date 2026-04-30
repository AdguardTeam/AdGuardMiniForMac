// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  DomainView.swift
//  AGSEDesignSystem
//

import SwiftUI
import ColorPalette

// MARK: - DomainView

public struct DomainView: View {
    // MARK: Private properties

    @Binding private var isProtectionEnabled: Bool

    // MARK: Public properties

    var configuration: Configuration

    // MARK: Init

    public init(
        isProtectionEnabled: Binding<Bool>,
        configuration: Configuration
    ) {
        self.configuration = configuration
        self._isProtectionEnabled = isProtectionEnabled
    }

    // MARK: UI

    public var body: some View {
        VStack(spacing: Space.zero) {
            self.domain
            self.separator
            Spacer.fixed(height: Margin.small)
            self.blockElement
            self.reportAnIssue
//            self.rateAdguardMini
            if self.configuration.state.hasAttention {
                self.attention
            }
            Spacer.fixed(height: Margin.small)
        }
    }

    @ViewBuilder
    private var attention: some View {
        PopupAttentionCell(
            title: self.configuration.attentionConfiguration.title,
            buttonText: self.configuration.attentionConfiguration.buttonText,
            action: self.configuration.attentionConfiguration.action
        )
    }

    @ViewBuilder
    private var domain: some View {
        let lines: [String] = {
            if let hint = self.hintText { return [hint] }
            guard self.isProtectionEnabled else { return [] }
            var result: [String] = []
            if let adsText = self.configuration.adsBlockedText { result.append(adsText) }
            if let trackersText = self.configuration.trackersBlockedText { result.append(trackersText) }
            return result
        }()

        PopupToggleCell(
            isOn: self.$isProtectionEnabled,
            configuration: .init(
                content: .init(
                    title: self.configuration.domain,
                    subtitleLines: lines,
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
                ),
                isEnabled: !self.configuration.state.isDisabled
            )
        )
    }

    @ViewBuilder
    private var blockElement: some View {
        PopupCellButton(
            isEnabled: !self.configuration.state.isDisabled,
            title: self.configuration.blockElementConfiguration.title,
            leftIcon: SEImage.Popup.target,
            leftIconColor: Palette.Icon.errorIcon,
            action: self.configuration.blockElementConfiguration.action
        )
    }

    @ViewBuilder
    private var reportAnIssue: some View {
        PopupCellButton(
            isEnabled: !self.configuration.state.isDisabled,
            title: self.configuration.reportAnIssueConfiguration.title,
            leftIcon: SEImage.Popup.dislike,
            leftIconColor: Palette.Icon.productTertiaryIcon,
            action: self.configuration.reportAnIssueConfiguration.action
        )
    }

//    @ViewBuilder
//    private var rateAdguardMini: some View {
//        PopupCellButton(
//            isEnabled: true,
//            title: self.configuration.rateAdguardMiniConfiguration.title,
//            leftIcon: SEImage.Popup.star,
//            leftIconColor: Palette.Icon.productIcon,
//            action: self.configuration.rateAdguardMiniConfiguration.action
//        )
//    }

    @ViewBuilder
    private var separator: some View {
        Divider()
            .background(Palette.strokeInputsInactiveInputStrokeDefault)
    }

    private var hintText: String? {
        !self.isProtectionEnabled
        ? self.configuration.hint
        : nil
    }
}

private extension Spacer {
    static func fixed(height: CGFloat) -> some View {
        Self(minLength: height)
            .frame(height: height)
    }
}

// MARK: - DomainView_Previews

private enum PreviewBuilder {
    static func buildDomainView(
        isProtectionEnabled: Bool = true,
        isDisabled: Bool = false,
        hasAttention: Bool = false,
        domain: String = Self.defaultDomain,
        hint: String = Self.defaultHint,
        adsBlockedText: String? = "2 ads blocked",
        trackersBlockedText: String? = "5 trackers blocked",
        attentionTitle: String = Self.attentionTitle,
        attentionButtonTitle: String = Self.attentionButtonTitle,
        blockElementTitle: String = Self.blockElementTitle,
        reportAnIssueTitle: String = Self.reportAnIssueTitle,
//        rateAdguardMiniConfiguration: String = Self.rateAdguardMiniConfiguration
    ) -> some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Text("Header example")
                Spacer()
            }
            .background(Color.accentColor)
            DomainView(
                isProtectionEnabled: .constant(isProtectionEnabled),
                configuration: .init(
                    state: .init(
                        isDisabled: isDisabled,
                        hasAttention: hasAttention
                    ),
                    domain: domain,
                    hint: hint,
                    adsBlockedText: isProtectionEnabled ? adsBlockedText : nil,
                    trackersBlockedText: isProtectionEnabled ? trackersBlockedText : nil,
                    attentionConfiguration: .init(
                        title: attentionTitle,
                        buttonText: attentionButtonTitle
                    ) {
                        print("\(attentionButtonTitle) clicked")
                    },
                    blockElementConfiguration: .init(
                        title: blockElementTitle
                    ) {
                        print("\(blockElementTitle) clicked")
                    },
                    reportAnIssueConfiguration: .init(
                        title: reportAnIssueTitle
                    ) {
                        print("\(reportAnIssueTitle) clicked")
                    }
//                    rateAdguardMiniConfiguration: .init(
//                        title: rateAdguardMiniConfiguration
//                    ) {
//                        print("\(rateAdguardMiniConfiguration) clicked")
//                    }
                )
            )
        }
        .border(.black)
        .frame(width: 320)
    }

    static let defaultDomain = "fonts.google.com"
    static let defaultHint = "Protection is off for this website as it may interfere with its operation"
    static let attentionTitle = "Some extensions are off"
    static let attentionButtonTitle = "Some extensions are off"
    static let blockElementTitle = "Block element"
    static let reportAnIssueTitle = "Report an issue"
    static let oneAdBlocked = "1 ad blocked"
    static let manyAdsBlocked = "1,234 ads blocked"
    static let oneTrackerBlocked = "1 tracker blocked"
    static let manyTrackersBlocked = "30,009 trackers blocked"
//    static let rateAdguardMiniConfiguration = "Rate AdGuard Mini"
}

#Preview("Domain enabled") {
    Group {
        VStack {
            HStack {
                PreviewBuilder.buildDomainView()
                PreviewBuilder.buildDomainView(isDisabled: true)
            }
            HStack {
                PreviewBuilder.buildDomainView(hasAttention: true)
                PreviewBuilder.buildDomainView(isDisabled: true, hasAttention: true)
            }
        }
        .padding()
    }
}

#Preview("Domain disabled") {
    Group {
        VStack {
            HStack {
                PreviewBuilder.buildDomainView(isProtectionEnabled: false)

                PreviewBuilder.buildDomainView(
                    isProtectionEnabled: false,
                    isDisabled: true
                )
            }

            HStack {
                PreviewBuilder.buildDomainView(isProtectionEnabled: false, hasAttention: true)

                PreviewBuilder.buildDomainView(
                    isProtectionEnabled: false,
                    isDisabled: true,
                    hasAttention: true
                )
            }
        }
        .padding()
    }
}

#Preview("System domain") {
    Group {
        VStack {
            PreviewBuilder.buildDomainView(
                isDisabled: true,
                domain: "Secure page",
                hint: "Technically, you shouldn't see this text.",
                adsBlockedText: nil,
                trackersBlockedText: nil
            )

            PreviewBuilder.buildDomainView(
                isDisabled: true,
                hasAttention: true,
                domain: "Secure page",
                hint: "Technically, you shouldn't see this text.",
                adsBlockedText: nil,
                trackersBlockedText: nil
            )
        }
        .padding()
    }
}

#Preview("Domain with stats") {
    Group {
        VStack {
            VStack(spacing: Space.compact) {
                Text("Single digit")
                    .font(.caption)
                    .foregroundColor(.secondary)
                PreviewBuilder.buildDomainView(
                    adsBlockedText: PreviewBuilder.oneAdBlocked,
                    trackersBlockedText: PreviewBuilder.oneTrackerBlocked
                )
            }
            .padding(.vertical)

            VStack(spacing: Space.compact) {
                Text("Large numbers")
                    .font(.caption)
                    .foregroundColor(.secondary)
                PreviewBuilder.buildDomainView(
                    adsBlockedText: PreviewBuilder.manyAdsBlocked,
                    trackersBlockedText: PreviewBuilder.manyTrackersBlocked
                )
            }

            VStack(spacing: Space.compact) {
                Text("No stats")
                    .font(.caption)
                    .foregroundColor(.secondary)
                PreviewBuilder.buildDomainView(
                    adsBlockedText: nil,
                    trackersBlockedText: nil
                )
            }
            .padding(.vertical)
        }
        .padding()
    }
}
