// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useTrackPage } from 'Modules/common/hooks/useTrackPage';
import { useSettingsStore } from 'Modules/settings/lib/hooks';
import { RouteName, SettingsPage } from 'Modules/settings/store/modules';

/**
 * Hook to track settings page views for telemetry
 * Tracks page views when users navigate between settings screens
 */
export function useTrackSettingsPage() {
    const { telemetry, router } = useSettingsStore();

    useTrackPage(router, telemetry, RouteToPage);
}

/**
 * Maps route names to settings page enums for telemetry tracking
 *
 * @param currentRoute The current route name
 * @returns Settings page enum or "unknown" if route is not mapped
 */
function RouteToPage(currentRoute: RouteName): SettingsPage | 'unknown' {
    switch (currentRoute) {
        case RouteName.safari_protection:
            return SettingsPage.SafariProtection;
        case RouteName.advanced_blocking:
            return SettingsPage.AdvancedBlocking;
        case RouteName.user_rules:
            return SettingsPage.UserRulesScreen;
        case RouteName.settings:
            return SettingsPage.SettingsScreen;
        case RouteName.license:
            return SettingsPage.LicenseSettingsScreen;
        case RouteName.support:
            return SettingsPage.SupportScreen;
        case RouteName.about:
            return SettingsPage.AboutScreen;
        case RouteName.user_rule:
            return SettingsPage.CreateRule;
        case RouteName.filters:
            return SettingsPage.FiltersScreen;
        case RouteName.safari_extensions:
            return SettingsPage.SafariExtensions;
        case RouteName.contact_support:
            return SettingsPage.ContactSupport;
        default:
            return 'unknown';
    }
}
