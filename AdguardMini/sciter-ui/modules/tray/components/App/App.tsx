// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createPortal } from 'preact/compat';

import { NotificationsRenderer } from 'Common/components/NotificationsRenderer';
import { useTrayStore } from 'TrayLib/hooks';

import { Router } from '../Router';

import './App.pcss';

const notifyContainer = document.getElementById('notify')!;

/**
 * App entry
 */
export function App() {
    const { notification } = useTrayStore();

    return (
        <>
            <Router />
            {createPortal(<NotificationsRenderer className="trayNotificationsContainer" notification={notification} />, notifyContainer)}
        </>
    );
}
