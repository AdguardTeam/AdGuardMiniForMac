// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  store.tsx
//  AdguardMini
//

import { createContext } from 'preact';

import { GetEffectiveThemeRequest } from 'Apis/requests/SettingsService';
import {
    AdvancedBlockingStore,
    FiltersMetaStore,
    LicenseStore,
    NotificationsQueue,
    SafariExtensionsStore,
} from 'Common/stores';
import { Action } from 'Common/utils/EventAction';

import {
    Account,
    ABTests,
    AppInfo,
    AppSettings,
    CallbackHandlers,
    CustomFilters,
    ImportExport,
    SafariProtection,
    UserRules,
    Windowing,
    UI,
    type SettingsTelemetry,
    settingsTelemetryFactory,
    settingsRouterFactory,
    type SettingsRouterStore,
} from './modules';

import type { EffectiveTheme } from 'Apis/types';
import type { ColorTheme } from 'Utils/colorThemes';

/**
 * Settings app store — thin DI registry.
 * Creates and wires sub-stores with explicit constructor DI.
 * No data fetching or cross-store orchestration in this class.
 */
export class SettingsStore {
    /**
     * License store (shared, exposed for callback access)
     */
    private readonly licenseStore: LicenseStore;

    /**
     * Advanced blocking store (shared, exposed for callback access)
     */
    public readonly advancedBlocking: AdvancedBlockingStore;

    /**
     * Safari extensions store (shared, exposed for callback access)
     */
    public readonly safariExtensions: SafariExtensionsStore;

    public account: Account;

    public abTests: ABTests;

    public appInfo: AppInfo;

    /**
     * Filter metadata store (shared)
     */
    public readonly filtersMeta: FiltersMetaStore;

    /**
     * Health-check computed properties (replaces old Filters.blockAds etc.)
     */
    public safariProtection: SafariProtection;

    /**
     * Custom filter CRUD operations
     */
    public customFilters: CustomFilters;

    public appSettings: AppSettings;

    public importExport: ImportExport;

    public userRules: UserRules;

    public windowing: Windowing;

    public notification: NotificationsQueue;

    public ui: UI;

    /**
     * Callback orchestration handler
     */
    public callbackHandlers: CallbackHandlers;

    /**
     * Settings window router store
     */
    public readonly router: SettingsRouterStore;

    /**
     * Settings window telemetry
     */
    public readonly telemetry: SettingsTelemetry;

    /**
     * Settings window effective theme changed event
     */
    public readonly settingsWindowEffectiveThemeChanged = new Action<EffectiveTheme>();

    /**
     * Ctor — creates and wires all sub-stores.
     * Each sub-store self-initializes (fetches its own data).
     */
    constructor() {
        // Zero-dependency stores
        this.abTests = new ABTests();
        this.windowing = new Windowing();
        this.notification = new NotificationsQueue();

        // Common shared stores
        this.licenseStore = new LicenseStore();
        this.filtersMeta = new FiltersMetaStore();
        this.advancedBlocking = new AdvancedBlockingStore();
        this.safariExtensions = new SafariExtensionsStore();

        // Settings domain sub-stores with explicit DI
        this.safariProtection = new SafariProtection(this.filtersMeta);
        this.customFilters = new CustomFilters(this.filtersMeta, this.safariProtection);
        this.appSettings = new AppSettings(this.windowing);
        this.importExport = new ImportExport(this.appSettings);
        this.account = new Account(this.licenseStore);

        // Zero-dependency stores (rootStore param already removed)
        this.appInfo = new AppInfo();
        this.userRules = new UserRules();
        this.ui = new UI();

        // Router & telemetry (factories)
        this.telemetry = settingsTelemetryFactory();
        this.router = settingsRouterFactory();

        // Callback handlers for cross-store orchestration
        this.callbackHandlers = new CallbackHandlers(
            this.licenseStore,
            this.filtersMeta,
            this.advancedBlocking,
            this.appSettings,
            this.importExport,
            this.customFilters,
            this.safariProtection,
            this.userRules,
            this.appInfo,
            this.ui,
            this.notification,
            this.router,
            this.telemetry,
            this.safariExtensions,
            this.account,
            this.settingsWindowEffectiveThemeChanged,
        );
    }

    /**
     * Get effective theme
     */
    public async getEffectiveTheme(): Promise<EffectiveTheme> {
        const { value } = await window.API.Execute(new GetEffectiveThemeRequest());
        return value;
    }

    /**
     * Color theme setter
     */
    public setColorTheme(colorTheme: ColorTheme): void {
        this.windowing.updateTheme(colorTheme);
    }
}

export const store = new SettingsStore();
const StoreContext = createContext<SettingsStore>(store);
export default StoreContext;
