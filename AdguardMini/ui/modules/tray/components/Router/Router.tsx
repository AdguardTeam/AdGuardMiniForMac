// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { Fragment } from 'preact/jsx-runtime';

import { useTrackTrayPage } from 'Modules/tray/lib/hooks/useTrackTrayPage';
import { useTrayStore } from 'TrayLib/hooks';
import { TrayRoute } from 'TrayStore/modules';

import { CheckUpdates } from '../CheckUpdates';
import { FiltersUpdate } from '../FiltersUpdate';
import { Home } from '../Home';

/**
 * Maps a route to its corresponding component
 *
 * @param route The route to map
 * @returns The corresponding component for the route
 */
function ComponentFromRoute<Route extends string>(route: Route) {
    switch (route) {
        case TrayRoute.home:
            return <Home />;
        case TrayRoute.updates:
            return <CheckUpdates />;
        case TrayRoute.filters:
            return <FiltersUpdate />;
        default:
            return null;
    }
}

/**
 * Component for handling Routes. Depending on RouterStore display current page
 */
function RouterComponent() {
    const { router, settings: { settings } } = useTrayStore();
    const page = ComponentFromRoute(router.currentPath);

    useTrackTrayPage();

    return <Fragment key={settings?.language}>{page}</Fragment>;
}

export const Router = observer(RouterComponent);
