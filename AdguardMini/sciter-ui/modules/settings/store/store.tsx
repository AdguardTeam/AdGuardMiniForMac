// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

// NOTE: Constructor DI waiver — sub-stores receive the root store
// (e.g., `new Account(this)`) rather than individual dependency injection.
// This is an intentional architectural tradeoff documented in AGENTS.md §V.1.
// The alternative (passing only specific sub-store references per constructor)
// was evaluated but rejected to avoid cascading parameter changes when the
// dependency graph evolves.

import { createContext } from 'preact';

import { GetEffectiveThemeRequest } from 'Apis/requests/SettingsService';
import { Action } from 'Common/utils/EventAction';
import { LicenseOrErrorExtended } from 'Apis/ExtendLicense';


import {
    Account,
    ABTests,
    AdvancedBlocking,
    AppInfo,
    Filters,
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
import type { LicenseOrError } from 'Apis/types';
import type { ColorTheme } from 'Utils/colorThemes';
import { RouteName } from './modules/SettingsRouter';

/**
 * Settings app store
 */
export class SettingsStore {
    public account: Account;

    public abTests: ABTests;

    public advancedBlocking: AdvancedBlocking;

    public appInfo: AppInfo;

    public filters: Filters;

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
        this.windowing = new Windowing();
        this.filters = new Filters(this);
        this.settings = new Settings(this.windowing);
        this.userRules = new UserRules(this);
        this.ui = new UI(this);
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
        this.settings.getHealthCheckDismissedCards();
        this.settings.getSafariExtensions();
        this.settings.getUserActionLastDirectory();
        this.userRules.getUserRules();
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
    public setColorTheme(colorTheme: ColorTheme) {
        this.windowing.updateTheme(colorTheme);
    }

    /**
     * Handle license update callback — refreshes related state.
     * Called from AccountCallbackServiceInternal.OnLicenseUpdate.
     */
    public async onLicenseUpdate(param: LicenseOrError) {
        await this.account.getTrialAvailability();
        this.account.setLicense(param as unknown as LicenseOrErrorExtended);
        this.settings.getSettings();
        this.advancedBlocking.getAdvancedBlocking();
    }

    /**
     * Handle custom filter subscription callback.
     * Navigates to the custom filters page and sets the subscribe URL.
     * Called from FiltersCallbackServiceInternal.OnCustomFiltersSubscribe.
     */
    public onCustomFiltersSubscribe(url: string) {
        this.router.changePath(RouteName.filters, {
            groupId: this.filters.filtersIndex.customGroupId,
        });
        this.filters.setCustomFiltersSubscribeURL(url);
    }
}

export const store = new SettingsStore();
const StoreContext = createContext<SettingsStore>(store);
export default StoreContext;
