// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { createPortal, useEffect } from 'preact/compat';

import { NotificationsRenderer, Loader } from 'Common/components';
import { useTheme, useTrayStore } from 'TrayLib/hooks';
import { applyThemeAttribute } from 'Utils/colorThemes';

import { Router } from '../Router';

import './App.pcss';

const notifyContainer = document.getElementById('notify')!;

/**
 * App entry
 */
export function AppComponent() {
    const { notification, settings, settings: { settings: traySettings } } = useTrayStore();

    useEffect(() => {
        settings.getEffectiveTheme();
    }, [settings]);

    useTheme((th) => {
        applyThemeAttribute(th);
    });

    if (settings.effectiveTheme === null || !traySettings) {
        return (
            <div className="Loader">
                <Loader large />
            </div>
        );
    }

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
