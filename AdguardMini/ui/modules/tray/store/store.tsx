// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createContext } from 'preact';

import { FiltersData } from 'Common/stores/FiltersData';
import { NotificationsQueue } from 'Common/stores/NotificationsQueue';
import { SafariProtectionData } from 'Common/stores/SafariProtectionData';

import {
    type TrayRouterStore,
    trayRouterFactory,
    type TrayTelemetry,
    trayTelemetryFactory,
    TrayCallbackServiceImpl,
} from './modules';
import { SettingsStore } from './modules/Settings';

/**
 * Store used in Tray
 */
export class TrayStore {
    public settings: SettingsStore;

    /**
     * Tray-owned minimal Filters data store instance.
     */
    public filters: FiltersData;

    /**
     * Tray-owned read-only Safari Protection data store instance.
     * Receives the Tray's {@link FiltersData} instance as an explicit
     * constructor dependency.
     */
    public safariProtection: SafariProtectionData;

    public notification: NotificationsQueue;

    /**
     * Tray router store for navigation
     */
    public readonly router: TrayRouterStore;

    /**
     * Tray telemetry instance
     */
    public readonly telemetry: TrayTelemetry;

    public readonly callbackService: TrayCallbackServiceImpl;

    /**
     * Ctor
     */
    public constructor() {
        this.settings = new SettingsStore();
        this.filters = new FiltersData();
        this.safariProtection = new SafariProtectionData(this.filters);
        this.notification = new NotificationsQueue();
        this.telemetry = trayTelemetryFactory();
        this.router = trayRouterFactory();
        this.callbackService = new TrayCallbackServiceImpl(
            this.settings,
            this.router,
            this.telemetry,
            this.notification,
            this.filters,
        );
    }
}

export const store = new TrayStore();
const StoreContext = createContext<TrayStore>(store);
export default StoreContext;
