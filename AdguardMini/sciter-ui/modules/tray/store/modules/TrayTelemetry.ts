// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import Telemetry from 'Modules/common/stores/Telemetry';

/**
 * Tray-specific telemetry constants
 */
export enum TrayPage {
    TrayMenu = 'tray_menu',
    UpdatesScreen = 'updates_screen',
}

/**
 * Tray-specific layers
 */
export enum TrayLayer {
    NotificationFrequentUpdates = 'notification_frequent_updates',
}

/**
 * Tray-specific events
 */
export enum TrayEvent {
    SettingsClick = 'settings_click',
    MainProtectionClick = 'main_protection_click',
    StoryUnlockFeaturesClick = 'story_unlock_features_click',
    StoreUseLicenseClick = 'story_use_license_click',
    StoryWhatFilterClick = 'story_what_filter_click',
    StoryLoveHearYouClick = 'story_love_hear_you_click',
    StoryWhatIsExtraClick = 'story_what_is_extra_click',
    FixItClick = 'fix_it_click',
    FixItProperlyClick = 'fix_it_properly_click',
    StoryEnableExtensionsClick = 'story_enable_extensions_click',
    UpdatesFiltersClick = 'updates_filters_click',
    FrequentUpdatesClick = 'frequent_updates_click',
    TelemetryClick = 'telemetry_click',
    StoryStatisticsClick = 'story_statistics_click',
    StoryStatisticSlideClick = 'story_statistic_slide_click',
    UpdateClick = 'update_click',
}

/**
 * Tray-specific telemetry type
 * Hydrates the base Telemetry with Tray-specific pages, events, and layers
 */
export type TrayTelemetry = Telemetry<TrayPage, TrayEvent, TrayLayer>;

/**
 * Creates and returns a new TrayTelemetry instance
 */
export function trayTelemetryFactory(): TrayTelemetry {
    return new Telemetry<TrayPage, TrayEvent, TrayLayer>(TrayPage.TrayMenu);
}
