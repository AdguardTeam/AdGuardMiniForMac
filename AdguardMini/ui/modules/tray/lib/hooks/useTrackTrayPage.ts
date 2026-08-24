// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useTrackPage } from 'Modules/common/hooks/useTrackPage';
import { TrayPage, TrayRoute } from 'Modules/tray/store/modules';

import { useTrayStore } from './useTrayStore';

/**
 * Tracks tray page views for telemetry
 * Automatically reports page views when the tray route changes
 */
export function useTrackTrayPage() {
    const { telemetry, router } = useTrayStore();

    useTrackPage(router, telemetry, RouteToPage);
}

/**
 * Maps tray routes to telemetry page names
 *
 * @param currentRoute The current tray route
 * @returns The corresponding telemetry page name or "unknown"
 */
function RouteToPage(currentRoute: TrayRoute): TrayPage | 'unknown' {
    switch (currentRoute) {
        case TrayRoute.home:
            return TrayPage.TrayMenu;
        case TrayRoute.updates:
            return TrayPage.UpdatesScreen;
        case TrayRoute.filters:
            return TrayPage.UpdatesScreen;
        default:
            return 'unknown';
    }
}
