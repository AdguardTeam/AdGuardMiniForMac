// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

// NOTE: Constructor DI waiver — sub-stores receive the root store
// (e.g., `new SettingsStore(this)`) rather than individual dependency injection.
// This is an intentional architectural tradeoff documented in AGENTS.md §V.1.
// The alternative (passing only specific sub-store references per constructor)
// was evaluated but rejected to avoid cascading parameter changes when the
// dependency graph evolves.

import { createContext } from 'preact';

import { GetEffectiveThemeRequest } from 'Apis/requests/TrayService';
import { NotificationsQueue } from 'Common/stores/NotificationsQueue';
import { Action } from 'Modules/common/utils/EventAction';

import {
    type TrayRouterStore,
    trayRouterFactory,
    type TrayTelemetry,
    trayTelemetryFactory,
    TrayPage,
} from './modules';
import { SettingsStore } from './modules/Settings';
import { TrayRoute } from './modules/TrayRouter';

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

    /**
     * Handle tray window visibility change callback.
     * Orchestrates settings refresh, telemetry, notifications, and navigation.
     * Called from TrayCallbackServiceInternal.OnTrayWindowVisibilityChange.
     */
    public async onWindowVisibilityChanged(isVisible: boolean) {
        if (isVisible) {
            await this.settings.getSettings();
            await this.settings.getStatistics();
            this.settings.getSafariExtensions();
            this.telemetry.setPage(TrayPage.TrayMenu);
            this.telemetry.trackPageView();
        } else {
            this.notification.clearAll();
            if (this.router.currentPath !== TrayRoute.home) {
                this.telemetry.setPage('unknown');
                this.router.changePath(TrayRoute.home);
            }
        }
        this.settings.getAdvancedBlocking();
        this.trayWindowVisibilityChanged.invoke(isVisible);
    }
}

export const store = new TrayStore();
const StoreContext = createContext<TrayStore>(store);
export default StoreContext;
