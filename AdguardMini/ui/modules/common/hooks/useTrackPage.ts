// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useLocation } from 'Modules/common/hooks/useLocation';

import type { RouterStore } from 'Modules/common/stores/RouterStore';
import type Telemetry from 'Modules/common/stores/Telemetry';

/**
 * Type alias for a function that maps a route to a page name
 * Used to ensure type safety when mapping routes to page names
 */
type RouteToPageFn<Route, Page> = (currentRoute: Route) => Page | 'unknown';

/**
 * Generic hook for tracking page views with telemetry
 *
 * @param router The router store to track
 * @param telemetry The telemetry instance to use
 * @param routeToPage Function that maps route to page name
 */
export function useTrackPage<
    Route extends string,
    Page extends string,
    R2P extends RouteToPageFn<Route, Page>,
>(router: RouterStore<Route>, telemetry: Telemetry<Page, any, any>, routeToPage: R2P) {
    useLocation(router, (currentRoute) => {
        const page = routeToPage(currentRoute);
        telemetry.setPage(page);

        if (page !== 'unknown') {
            telemetry.trackPageView();
        }
    }, false);
}
