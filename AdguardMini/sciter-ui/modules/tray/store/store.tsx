// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createContext } from 'preact';

import { GetEffectiveThemeRequest } from 'Apis/requests/TrayService';
import { Action } from 'Modules/common/utils/EventAction';

import {
    type TrayRouterStore,
    trayRouterFactory,
    type TrayTelemetry,
    trayTelemetryFactory,
} from './modules';
import { NotificationsQueue } from './modules/NotificationsQueue';
import { SettingsStore } from './modules/Settings';

import type { EffectiveTheme } from 'Apis/types';

/**
 * Store used in Tray
 */
export class TrayStore {
    public settings: SettingsStore;

    public notification: NotificationsQueue;

    /**
     * Tray router store for navigation
     */
    public readonly router: TrayRouterStore;

    /**
     * Tray window visibility changed event
     */
    public readonly trayWindowVisibilityChanged = new Action<boolean>();

    /**
     * Tray window effective theme changed event
     */
    public readonly trayWindowEffectiveThemeChanged = new Action<EffectiveTheme>();

    /**
     * Tray telemetry instance
     */
    public readonly telemetry: TrayTelemetry;

    /**
     * Ctor
     */
    public constructor() {
        this.settings = new SettingsStore(this);
        this.notification = new NotificationsQueue();
        this.telemetry = trayTelemetryFactory();
        this.router = trayRouterFactory();
    }

    /**
     * Get effective theme
     */
    public async getEffectiveTheme(): Promise<EffectiveTheme> {
        const { value } = await window.API.Execute(new GetEffectiveThemeRequest());
        return value;
    }
}

export const store = new TrayStore();
const StoreContext = createContext<TrayStore>(store);
export default StoreContext;
