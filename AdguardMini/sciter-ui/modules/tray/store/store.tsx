// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createContext } from 'preact';

import { GetEffectiveThemeRequest } from 'Apis/requests/ThemeService';
import { FiltersData } from 'Common/stores/FiltersData';
import { NotificationsQueue } from 'Common/stores/NotificationsQueue';
import { SafariProtectionData } from 'Common/stores/SafariProtectionData';
import { Action } from 'Modules/common/utils/EventAction';

import {
    type TrayRouterStore,
    trayRouterFactory,
    type TrayTelemetry,
    trayTelemetryFactory,
} from './modules';
import { SettingsStore } from './modules/Settings';

import type { EffectiveTheme } from 'Apis/types';

/**
 * Store used in Tray
 */
export class TrayStore {
    public settings: SettingsStore;

    /**
     * Tray-owned minimal Filters data store instance. Distinct from the
     * Settings module's full Filters instance (each Sciter process
     * constructs its own). Constructed before `safariProtection` because
     * the Safari Protection data store depends on it.
     *
     * Holds only the read-only filter metadata and enabled-filter data
     * needed by the health-check stories — no mutation methods.
     */
    public filters: FiltersData;

    /**
     * Tray-owned read-only Safari Protection data store instance.
     * Receives the Tray's {@link FiltersData} instance as an explicit
     * constructor dependency. Distinct from the Settings module's
     * `SafariProtection` instance.
     *
     * Exposes only the computed health-check getters (`blockAds`,
     * `blockSocialButtons`, etc.) — no mutation methods.
     */
    public safariProtection: SafariProtectionData;

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
        this.filters = new FiltersData();
        this.safariProtection = new SafariProtectionData(this.filters);
        this.notification = new NotificationsQueue();
        this.telemetry = trayTelemetryFactory();
        this.router = trayRouterFactory();
    }

    /**
     * Refresh filters data and app-level settings from the platform.
     *
     * Called when the Tray window becomes visible, per `AGENTS.md` §V:
     * hidden Sciter windows do not process idle, so DOM-mutating
     * callback data must not be delivered while hidden. The Tray
     * re-fetches the latest data on every visibility transition to
     * ensure the health-check stories reflect the current platform
     * state.
     *
     * The platform delivers filters-update callbacks exclusively to
     * the Settings window — the Tray has no `FiltersCallbackService`
     * registration — so this visibility-triggered fetch is the sole
     * update path for the Tray's filters data.
     */
    public refreshFiltersData() {
        this.filters.getEnabledFilters();
        this.filters.getFilters();
        this.filters.getFiltersIndex();
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
