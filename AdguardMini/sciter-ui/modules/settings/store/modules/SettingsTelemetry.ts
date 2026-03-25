// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Telemetry from 'Modules/common/stores/Telemetry';

import { UserRulesPages, UserRulesEvents } from 'Modules/common/utils/consts';

/**
 * Settings-specific pages
 */
export enum SettingsPage {
    SafariProtection = 'safari_protection',
    AdvancedBlocking = 'advanced_blocking',
    UserRulesScreen = 'user_rules_screen',
    SettingsScreen = 'settings_screen',
    LicenseSettingsScreen = 'license_settings_screen',
    SupportScreen = 'support_screen',
    AboutScreen = 'about_screen',
    CreateRule = 'create_rule',
    FiltersScreen = 'filters_screen',
    SafariExtensions = 'safari_extensions',
    ContactSupport = 'contact_support',
}

/**
 * Settings-specific layers
 */
export enum SettingsLayer {
    EnjoyTrial = 'enjoy_trial',
    FailedActivation = 'failed_activation',
    FullVersionActivatedScreen = 'full_version_activated_screen',
    NoPurchaseScreen = 'no_purchase_screen',
    SellingScreen = 'selling_screen',
}

/**
 * Settings-specific events
 */
export enum SettingsEvent {
    BlockAdsProtectionClick = 'block_ads_protection_click',
    BlockSearchAds = 'block_search_ads',
    LanguageAdBlockingClick = 'language_ad_blocking_click',
    LanguageAdBlockingSettingsClick = 'language_ad_blocking_settings_click',
    BlockTrackerClick = 'block_tracker_click',
    SocialButtonsClick = 'social_buttons_click',
    CookieClick = 'cookie_click',
    PopUpsClick = 'pop_ups_click',
    WidgetsClick = 'widgets_click',
    AnnoyancesClick = 'annoyances_click',
    OtherFiltersClick = 'other_filters_click',
    CustomFiltersClick = 'custom_filters_click',
    AdvancedRulesClick = 'advanced_rules_click',
    AdguardExtraClick = 'adguard_extra_click',
    TryForFreeExtraClick = 'try_for_free_extra_click',
    RuleSyntaxClick = 'rule_syntax_click',
    UpdateFiltersAutoClick = 'update_filters_auto_click',
    RealTimeUpdatesClick = 'real_time_updates_click',
    RealTimeUpdatesTryForFreeClick = 'real_time_updates_try_for_free_click',
    ResetToDefaultClick = 'reset_to_default_click',
    Try14DaysClick = 'try_14_days_click',
    LogInClick = 'log_in_click',
    RestoreClick = 'restore_click',
    ActivateViaCodeClick = 'activate_via_code_click',
    SubscribeTrialEndClick = 'subscribe_trial_end_click',
    BindLicenseClick = 'bind_license_click',
    RenewClick = 'renew_click',
    ManageSubscriptionClick = 'manage_subscription_click',
    MonthlyClick = 'monthly_click',
    Try14SellingScreenClick = 'try_14_selling_screen_click',
    SubscribeSellingScreenClick = 'subscribe_selling_screen_click',
    GetFullVersionClick = 'get_full_version_click',
    TryForFreeFiltersClick = 'try_for_free_filters_click',
    FlagClick = 'flag_click',
    NoRestoreSubscribeClick = 'no_restore_subscribe_click',
    CreateRuleClick = 'create_rule_click',
    TryForFreeAbTest = 'try_for_free_ab_test',
    EnableUpdatesAbTest = 'enable_updates_ab_test',
    ExtraAbTest = 'extra_ab_test',
    RealTimeAbTest = 'real_time_ab_test',
    FixItClick = 'fix_it_click',
    SendReportABug = 'send_report_a_bug',
}

/**
 * Telemetry type for settings window module
 */
export type SettingsTelemetry = Telemetry<
    SettingsPage | UserRulesPages,
    SettingsEvent | UserRulesEvents,
    SettingsLayer
>;

/**
 * Creates and returns a new settings telemetry instance.
 */
export function settingsTelemetryFactory(): SettingsTelemetry {
    return new Telemetry<SettingsPage, SettingsEvent, SettingsLayer>(SettingsPage.SafariProtection);
}
