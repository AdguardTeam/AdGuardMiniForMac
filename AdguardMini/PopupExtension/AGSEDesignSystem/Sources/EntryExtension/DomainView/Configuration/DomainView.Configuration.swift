// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  DomainView.Configuration.swift
//  AGSEDesignSystem
//

extension DomainView {
    // MARK: - Configuration

    public struct Configuration {
        let domain: String
        let hint: String?
        let adsBlockedText: String?
        let trackersBlockedText: String?
        let attentionConfiguration: AttentionConfiguration
        let blockElementConfiguration: ButtonConfiguration
        let reportAnIssueConfiguration: ButtonConfiguration
//        let rateAdguardMiniConfiguration: ButtonConfiguration
        let state: State

        public init(
            state: State,
            domain: String,
            hint: String?,
            adsBlockedText: String?,
            trackersBlockedText: String?,
            attentionConfiguration: AttentionConfiguration,
            blockElementConfiguration: ButtonConfiguration,
            reportAnIssueConfiguration: ButtonConfiguration,
//            rateAdguardMiniConfiguration: ButtonConfiguration
        ) {
            self.domain = domain
            self.hint = hint
            self.adsBlockedText = adsBlockedText
            self.trackersBlockedText = trackersBlockedText
            self.attentionConfiguration = attentionConfiguration
            self.blockElementConfiguration = blockElementConfiguration
            self.reportAnIssueConfiguration = reportAnIssueConfiguration
//            self.rateAdguardMiniConfiguration = rateAdguardMiniConfiguration
            self.state = state
        }
    }

    // MARK: - ButtonConfiguration

    public struct AttentionConfiguration {
        public let title: String
        public let buttonText: String
        public var action: () -> Void

        public init(title: String, buttonText: String, action: @escaping () -> Void) {
            self.title = title
            self.buttonText = buttonText
            self.action = action
        }
    }

    // MARK: - ButtonConfiguration

    public struct ButtonConfiguration {
        public let title: String
        public var action: () -> Void

        public init(title: String, action: @escaping () -> Void) {
            self.title = title
            self.action = action
        }
    }
}
