// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { createPortal, useEffect } from 'preact/compat';

import { NotificationsRenderer } from 'Common/components/NotificationsRenderer';
import { useTheme, useTrayStore } from 'TrayLib/hooks';
import { applyThemeAttribute } from 'Utils/colorThemes';

import { Router } from '../Router';

import './App.pcss';

const notifyContainer = document.getElementById('notify')!;

/**
 * App entry
 */
export function AppComponent() {
    const { notification, settings } = useTrayStore();

    useEffect(() => {
        // Attach a catch so a rejected RPC (timeout/unavailable bridge)
        // cannot surface as an unhandled rejection.
        settings.getEffectiveTheme().catch((err) => {
            // eslint-disable-next-line no-console
            console.error('[tray] getEffectiveTheme failed:', err);
        });
    }, [settings]);

    useTheme((th) => {
        applyThemeAttribute(th);
    });

    return (
        <>
            <Router />
            {createPortal(
                <NotificationsRenderer
                    className="TrayNotificationsContainer"
                    notification={notification}
                />,
                notifyContainer,
            )}
        </>
    );
}

export const App = observer(AppComponent);
