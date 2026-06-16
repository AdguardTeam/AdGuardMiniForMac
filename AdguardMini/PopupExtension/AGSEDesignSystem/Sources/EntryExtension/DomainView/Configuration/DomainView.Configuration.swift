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
        let upsellConfiguration: UpsellConfiguration?
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
            upsellConfiguration: UpsellConfiguration? = nil,
//            rateAdguardMiniConfiguration: ButtonConfiguration
        ) {
            self.domain = domain
            self.hint = hint
            self.adsBlockedText = adsBlockedText
            self.trackersBlockedText = trackersBlockedText
            self.attentionConfiguration = attentionConfiguration
            self.blockElementConfiguration = blockElementConfiguration
            self.reportAnIssueConfiguration = reportAnIssueConfiguration
            self.upsellConfiguration = upsellConfiguration
//            self.rateAdguardMiniConfiguration = rateAdguardMiniConfiguration
            self.state = state
        }
    }

    // MARK: - AttentionConfiguration

    public struct AttentionConfiguration {
        public let title: String
        public var action: () -> Void

        public init(title: String, action: @escaping () -> Void) {
            self.title = title
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

    // MARK: - UpsellConfiguration

    /// Configuration for the upsell CTA button shown to free users.
    public struct UpsellConfiguration {
        public let title: String
        public let description: String
        public var action: () -> Void

        public init(title: String, description: String, action: @escaping () -> Void) {
            self.title = title
            self.description = description
            self.action = action
        }
    }
}
