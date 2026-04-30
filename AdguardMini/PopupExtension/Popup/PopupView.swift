// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupView.swift
//  EntryExtension
//

import SwiftUI
import AGSEDesignSystem

// MARK: - Constants

fileprivate enum Constants {
    // MARK: Sizes

    static let popupWidth: CGFloat = 320
}

// MARK: - PopupView

struct PopupView: View {
    // MARK: Private properties

    @ObservedObject private var viewModel: ViewModel

    // MARK: Init

    init(viewModel: ViewModel) {
        self.viewModel = viewModel
    }

    // MARK: UI

    var body: some View {
        VStack {
            HeaderView(
                isBusy: self.viewModel.isBusy,
                isPauseButtonAvailable: self.viewModel.isPauseButtonAvailable,
                isSettingsButtonAvailable: self.viewModel.isOnboardingCompleted,
                pauseAction: self.viewModel.pauseClicked,
                settingsAction: self.viewModel.settingsClicked
            )
            self.mainBody
        }
        .frame(width: Constants.popupWidth)
    }

    private var mainBody: some View {
        Group {
            switch viewModel.popupLayout {
            case .domain:
                self.domainBody
            case .adguardNotLaunched:
                self.infoNotLaunchedBody
            case .protectionIsDisabled:
                self.infoProtectionDisabledBody
            case .somethingWentWrong:
                self.infoSomethingWentWrongBody
            case .onboardingWasntCompleted:
                self.infoOnboardingWasntCompletedBody
            }
        }
    }

    @ViewBuilder
    private var domainBody: some View {
        DomainView(
            isProtectionEnabled: self.$viewModel.isProtectionEnabledForUrl,
            configuration: .init(
                state: .init(
                    isDisabled: self.viewModel.isBusy || self.viewModel.isSystemPage,
                    hasAttention: !self.viewModel.isAllExtensionsEnabled
                ),
                domain: self.viewModel.domain,
                hint: self.viewModel.isSystemPage
                    ? nil
                    : .localized.base.item_hint_domain_protection_off,
                adsBlockedText: self.formatStatsLine(
                    count: self.viewModel.adsBlocked,
                    format: .localized.base.item_stats_ads_blocked
                ),
                trackersBlockedText: self.formatStatsLine(
                    count: self.viewModel.trackersBlocked,
                    format: .localized.base.item_stats_trackers_blocked
                ),
                attentionConfiguration: .init(
                    title: .localized.base.item_attention_title_extensions_off,
                    buttonText: .localized.base.item_attention_button_title_fix_it,
                    action: self.viewModel.fixItClicked
                ),
                blockElementConfiguration: .init(
                    title: .localized.base.item_title_block_element,
                    action: self.viewModel.blockElementClicked
                ),
                reportAnIssueConfiguration: .init(
                    title: .localized.base.item_title_report_an_issue,
                    action: self.viewModel.reportAnIssueClicked
                )
//              AG-49352  rateAdguardMiniConfiguration: .init(
//                    title: .localized.base.item_title_rate_adguard_mini,
//                    action: self.viewModel.rateAdguardMiniClicked
//                )
            )
        )
    }

    private func formatStatsLine(count: Int, format: String) -> String? {
        guard !self.viewModel.isSystemPage else { return nil }
        let formatted = NumberFormatter.localizedString(from: NSNumber(value: count), number: .decimal)
        return String.localizedStringWithFormat(format, count, formatted)
    }

    @ViewBuilder
    private var infoNotLaunchedBody: some View {
        InfoView(
            configuration: .init(
                state: self.viewModel.popupState,
                image: SEImage.Adguard.thinkingAgnar,
                baseContent: .init(
                    title: .localized.base.info_title_main_app_not_running,
                    text: .localized.base.info_base_common_subtitle,
                    buttonText: .localized.base.info_button_title_launch
                ),
                loadingContent: .init(
                    title: .localized.base.info_title_main_app_not_running,
                    text: .localized.base.info_base_common_subtitle,
                    buttonText: .localized.base.info_button_title_launching
                ),
                errorContent: .init(
                    title: .localized.base.info_title_failed_launch_main_app,
                    text: .localized.base.info_error_subtitle,
                    buttonText: .localized.base.info_common_button_title_try_again
                ),
                action: self.viewModel.buttonClicked
            )
        )
    }

    @ViewBuilder
    private var infoProtectionDisabledBody: some View {
        InfoView(
            configuration: .init(
                state: self.viewModel.popupState,
                image: SEImage.Adguard.thinkingAgnar,
                baseContent: .init(
                    title: .localized.base.info_title_protection_disabled,
                    text: .localized.base.info_base_common_subtitle,
                    buttonText: .localized.base.info_button_title_enable
                ),
                loadingContent: .init(
                    title: .localized.base.info_title_protection_disabled,
                    text: .localized.base.info_base_common_subtitle,
                    buttonText: .localized.base.info_button_title_enabling
                ),
                errorContent: .init(
                    title: .localized.base.info_title_failed_enable_protection,
                    text: .localized.base.info_error_subtitle,
                    buttonText: .localized.base.info_common_button_title_try_again
                ),
                action: self.viewModel.buttonClicked
            )
        )
    }

    @ViewBuilder
    private var infoSomethingWentWrongBody: some View {
        InfoView(
            configuration: .init(
                state: self.viewModel.popupState,
                image: SEImage.Adguard.thinkingAgnar,
                baseContent: .init(
                    title: .localized.base.info_title_something_went_wrong,
                    text: .localized.base.info_subtitle_restart_app,
                    buttonText: .localized.base.info_button_title_restart
                ),
                loadingContent: .init(
                    title: .localized.base.info_title_something_went_wrong,
                    text: .localized.base.info_subtitle_restart_app,
                    buttonText: .localized.base.info_button_title_restarting
                ),
                errorContent: .init(
                    title: .localized.base.info_title_failed_restart_main_app,
                    text: .localized.base.info_error_subtitle,
                    buttonText: .localized.base.info_common_button_title_try_again
                ),
                action: self.viewModel.buttonClicked
            )
        )
    }

    @ViewBuilder
    private var infoOnboardingWasntCompletedBody: some View {
        InfoView(
            configuration: .init(
                state: self.viewModel.popupState,
                image: SEImage.Adguard.thumbsUpAgnar,
                baseContent: .init(
                    title: .localized.base.info_title_set_up_ad_blocker,
                    text: .localized.base.info_subtitle_set_up_ad_blocker,
                    buttonText: .localized.base.info_button_title_open_main_app
                ),
                loadingContent: .init(
                    title: .localized.base.info_title_set_up_ad_blocker,
                    text: .localized.base.info_subtitle_set_up_ad_blocker,
                    buttonText: .localized.base.info_button_title_opening
                ),
                errorContent: .init(
                    title: .localized.base.info_title_set_up_ad_blocker,
                    text: .localized.base.info_subtitle_set_up_ad_blocker,
                    buttonText: .localized.base.info_button_title_open_main_app
                ),
                action: self.viewModel.buttonClicked
            )
        )
    }
}
