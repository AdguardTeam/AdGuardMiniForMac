// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  store.tsx
//  AdguardMini
//

import { createContext } from 'preact';

import { GetEffectiveThemeRequest } from 'Apis/requests/TrayService';
import {
    AdvancedBlockingStore,
    FiltersMetaStore,
    LicenseStore,
    NotificationsQueue,
    SafariExtensionsStore,
} from 'Common/stores';
import { Action } from 'Modules/common/utils/EventAction';

import {
    CallbackHandlers,
    TraySettings,
    TrayLicense,
    TrayFilters,
    TrayStatistics,
    type TrayRouterStore,
    trayRouterFactory,
    type TrayTelemetry,
    trayTelemetryFactory,
} from './modules';

import type { EffectiveTheme } from 'Apis/types';

/**
 * Store used in Tray — thin DI registry.
 * Creates and wires sub-stores with explicit constructor DI.
 */
export class TrayStore {
    /**
     * License store (shared, exposed for callback access)
     */
    private readonly licenseStore: LicenseStore;

    /**
     * Advanced blocking store (shared, exposed for callback access)
     */
    public readonly advancedBlocking: AdvancedBlockingStore;

    public traySettings: TraySettings;

    public trayLicense: TrayLicense;

    public trayFilters: TrayFilters;

    public trayStatistics: TrayStatistics;

    public notification: NotificationsQueue;

    public safariExtensions: SafariExtensionsStore;

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
     * Callback orchestration handler
     */
    public callbackHandlers: CallbackHandlers;

    /**
     * Ctor — creates and wires all sub-stores
     */
    public constructor() {
        // Zero-dependency stores
        this.notification = new NotificationsQueue();

        // Common shared stores
        this.licenseStore = new LicenseStore();
        const filtersMeta = new FiltersMetaStore();
        this.advancedBlocking = new AdvancedBlockingStore();
        this.safariExtensions = new SafariExtensionsStore();

        // Tray domain sub-stores with explicit DI
        this.traySettings = new TraySettings(this.licenseStore);
        this.trayLicense = new TrayLicense(this.licenseStore);
        this.trayFilters = new TrayFilters(filtersMeta);
        this.trayStatistics = new TrayStatistics();

        // Router & telemetry (factories)
        this.telemetry = trayTelemetryFactory();
        this.router = trayRouterFactory();

        // Callback handlers for cross-store orchestration
        this.callbackHandlers = new CallbackHandlers(
            this.traySettings,
            this.trayStatistics,
            this.advancedBlocking,
            this.notification,
            this.router,
            this.telemetry,
            this.trayWindowVisibilityChanged,
            this.safariExtensions,
            this.trayFilters,
            this.trayLicense,
            this.trayWindowEffectiveThemeChanged,
        );
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
