// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createContext } from 'preact';

import { EmptyValue } from 'Apis/types';
import { Action } from 'Common/utils/EventAction';

import {
    Account,
    ABTests,
    AdvancedBlocking,
    AppInfo,
    Filters,
    SafariProtection,
    Settings,
    UserRules,
    Windowing,
    NotificationsQueue,
    UI,
    type SettingsTelemetry,
    settingsTelemetryFactory,
    settingsRouterFactory,
    type SettingsRouterStore,
} from './modules';

import type { EffectiveTheme } from 'Apis/types';
import type { ColorTheme } from 'Utils/colorThemes';

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
     * Settings window effective theme changed event
     */
    public readonly settingsWindowEffectiveThemeChanged = new Action<EffectiveTheme>();

    /**
     * Ctor
     */
    constructor() {
        this.account = new Account(this);
        this.abTests = new ABTests();
        this.advancedBlocking = new AdvancedBlocking(this);
        this.appInfo = new AppInfo(this);
        this.filters = new Filters(this);
        this.safariProtection = new SafariProtection(this);
        this.settings = new Settings(this);
        this.userRules = new UserRules(this);
        this.ui = new UI(this);
        this.windowing = new Windowing();
        this.notification = new NotificationsQueue();
        this.telemetry = settingsTelemetryFactory();
        this.router = settingsRouterFactory();

        this.init();
    }

    /**
     * initializing function
     */
    private init() {
        this.account.getLicense();
        this.account.getTrialAvailability();
        this.abTests.loadActiveABTests();
        this.advancedBlocking.getAdvancedBlocking();
        this.appInfo.getAppInfo();
        this.filters.getEnabledFilters();
        this.filters.getFilters();
        this.filters.getFiltersIndex();
        this.filters.getFiltersGroupedByExtension();
        this.settings.getSettings();
        this.settings.getSafariExtensions();
        this.settings.getUserActionLastDirectory();
        this.userRules.getUserRules();
    }

    /**
     * Get effective theme
     */
    public async getEffectiveTheme(): Promise<EffectiveTheme> {
        const { value } = await window.API.settingsService.GetEffectiveTheme(new EmptyValue());
        return value;
    }

    /**
    * Color theme setter
    */
    public setColorTheme(colorTheme: ColorTheme) {
        this.windowing.updateTheme(colorTheme);
    }
}

export const store = new SettingsStore();
const StoreContext = createContext<SettingsStore>(store);
export default StoreContext;
