// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { TrayRoute } from './TrayRouter';
import { TrayPage } from './TrayTelemetry';

import type { SettingsStore } from './Settings';
import type { TrayRouterStore } from './TrayRouter';
import type { TrayTelemetry } from './TrayTelemetry';
import type { BoolValue, FiltersStatus, SafariExtensionUpdate, TrayLicenseOrError, EffectiveThemeValue, StringValue } from 'Apis/types';
import type { NotificationsQueue } from 'Common/stores/NotificationsQueue';
import type { FiltersData } from 'Modules/common/stores/FiltersData';

/**
 * Class that implements the TrayCallbackService interface.
 * It is used to handle callbacks from the Swift side of the application.
 * The recovery sequence stays in TrayCallbackServiceInternal.
 */
export class TrayCallbackServiceImpl {
    private readonly settings: SettingsStore;
    private readonly router: TrayRouterStore;
    private readonly telemetry: TrayTelemetry;
    private readonly notification: NotificationsQueue;
    private readonly filters: FiltersData;

    /**
     *
     */
    constructor(
        settings: SettingsStore,
        router: TrayRouterStore,
        telemetry: TrayTelemetry,
        notification: NotificationsQueue,
        filtersData: FiltersData,
    ) {
        this.settings = settings;
        this.router = router;
        this.telemetry = telemetry;
        this.notification = notification;
        this.filters = filtersData;
    }

    /**
     * OnTrayWindowVisibilityChange callback handler
     */
    public OnTrayWindowVisibilityChange(param: BoolValue) {
        if (param.value) {
            this.settings.getSettings();
            this.settings.getStatistics();
            this.settings.getSafariExtensions();
            this.settings.getTrayLicense();
            this.settings.checkApplicationVersion();
            this.settings.getAdvancedBlocking();
            this.settings.getURLFilterState();
            this.filters.getEnabledFilters();
            this.filters.getFilters();
            this.filters.getFiltersIndex();
            this.telemetry.setPage(TrayPage.TrayMenu);
            this.telemetry.trackPageView();
        } else {
            // When hide tray window, clear all notifications
            this.notification.clearAll();
            // On Tray close, if user is not on home page, set it to home,
            // because when user will open tray again, he will see the same page as before,
            //  and it can be confusing if he was not on home page
            if (this.router.currentPath !== TrayRoute.home) {
                // Set page to unknown, for correct telemetry track
                this.telemetry.setPage('unknown');
                this.router.changePath(TrayRoute.home);
            }
        }
        this.settings.setTrayWindowVisible(param.value);
    }

    /**
     * OnLoginItemStateChange callback handler
     */
    public OnLoginItemStateChange(param: BoolValue) {
        this.settings.setLoginItem(param.value);
    }

    /**
     * OnApplicationVersionStatusResolved callback handler
     */
    public OnApplicationVersionStatusResolved(param: BoolValue) {
        this.settings.setNewVersionAvailable(param.value);
    }

    /**
     * OnFilterStatusResolved callback handler
     */
    public OnFilterStatusResolved(param: FiltersStatus) {
        this.settings.setFiltersStatus(param);
        // Refresh global settings here to pull the latest lastFiltersUpdateTimestampMs
        // right after Swift reports final filter update status.
        this.settings.getSettings();
    }

    /**
     * OnSafariExtensionUpdate callback handler
     */
    public OnSafariExtensionUpdate(param: SafariExtensionUpdate) {
        this.settings.updateSafariExtension(param);
    }

    /**
     * OnLicenseUpdate callback handler
     */
    public OnLicenseUpdate(param: TrayLicenseOrError) {
        this.settings.setLicense(param);
        this.settings.getAdvancedBlocking();
        this.settings.getURLFilterState();
    }

    /**
     * OnEffectiveThemeChanged callback handler
     */
    public OnEffectiveThemeChanged(param: EffectiveThemeValue) {
        this.settings.setEffectiveTheme(param.value);
    }

    /**
     * OnTrayPageRequested callback handler
     */
    public OnTrayPageRequested(param: StringValue) {
        if (Object.values(TrayRoute).includes(param.value as TrayRoute)) {
            this.router.changePath(param.value as TrayRoute);
        }
    }
}
