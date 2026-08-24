// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createContext } from 'preact';

import {
    Account,
    ABTests,
    AdvancedBlocking,
    AppInfo,
    Filters,
    SafariProtection,
    Settings,
    UserRules,
    type Windowing,
    windowing,
    NotificationsQueue,
    UI,
    type SettingsTelemetry,
    settingsTelemetryFactory,
    settingsRouterFactory,
    type SettingsRouterStore,
} from './modules';

/**
 * Settings app store
 */
export class SettingsStore {
    public account: Account;

    public abTests: ABTests;

    public advancedBlocking: AdvancedBlocking;

    public appInfo: AppInfo;

    public filters: Filters;

    public safariProtection: SafariProtection;

    public settings: Settings;

    public userRules: UserRules;

    public windowing: Windowing;

    public notification: NotificationsQueue;

    public ui: UI;

    /**
     * Settings window router store
     */
    public readonly router: SettingsRouterStore;

    /**
     * Settings window telemetry
     */
    public readonly telemetry: SettingsTelemetry;

    /**
     * Ctor
     */
    constructor() {
        this.notification = new NotificationsQueue();
        this.account = new Account();
        this.abTests = new ABTests();
        this.advancedBlocking = new AdvancedBlocking(this.notification);
        this.appInfo = new AppInfo();
        this.filters = new Filters();
        this.settings = new Settings();
        this.safariProtection = new SafariProtection(this.filters);
        this.userRules = new UserRules();
        this.ui = new UI();
        this.windowing = windowing;
        this.telemetry = settingsTelemetryFactory();
        this.router = settingsRouterFactory();

        this.init();
    }

    /**
     * initializing function
     */
    private init() {
        this.settings.getEffectiveTheme();
        this.account.getLicense();
        this.account.getTrialAvailability();
        this.abTests.loadActiveABTests();
        this.advancedBlocking.getAdvancedBlocking();
        this.advancedBlocking.getURLFilterState();
        this.appInfo.getAppInfo();
        this.filters.getEnabledFilters();
        this.filters.getFilters();
        this.filters.getFiltersIndex();
        this.filters.getFiltersGroupedByExtension();
        this.settings.getSettings();
        this.settings.getHealthCheckDismissedCards();
        this.settings.getPromoDismissedCards();
        this.settings.getSafariExtensions();
        this.settings.getUserActionLastDirectory();
        this.userRules.getUserRules();
    }
}

export const store = new SettingsStore();
const StoreContext = createContext<SettingsStore>(store);
export default StoreContext;
