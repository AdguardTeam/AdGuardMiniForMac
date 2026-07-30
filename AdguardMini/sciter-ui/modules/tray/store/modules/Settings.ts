// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { LogLevel } from '@adg/sciter-utils-kit';
import { makeAutoObservable } from 'mobx';

import { GetTrayLicenseRequest, GetTrialAvailableDaysRequest } from 'Apis/requests/AccountService';
import { GetAdvancedBlockingRequest, GetURLFilterStateRequest, UpdateURLFilterConfigurationRequest } from 'Apis/requests/AdvancedBlockingService';
import { CheckApplicationVersionRequest } from 'Apis/requests/AppUpdateService';
import { GetFiltersMetadataRequest, RequestFiltersUpdateRequest } from 'Apis/requests/FiltersService';
import { OpenSettingsWindowRequest } from 'Apis/requests/InternalService';
import { GetSafariExtensionsRequest } from 'Apis/requests/SafariExtensionsService';
import { RequestOpenSettingsPageRequest } from 'Apis/requests/SystemService';
import { GetStatisticsRequest, GetTraySettingsRequest, UpdateTraySettingsRequest } from 'Apis/requests/TraySettingsService';
import { GlobalSettings, TrayLicenseOrError, LicenseStatus, ReleaseVariants, StatisticsPeriod, StatisticsResponse, FiltersStatus, URLFilterConfiguration } from 'Apis/types';
import { SafariExtensionsStore } from 'Common/stores/SafariExtensionsStore';
import { updateLanguage } from 'Intl';

import type { Filters, Filter, FilterUpdateStatus, SafariExtensionUpdate, SafariExtensions, AdvancedBlocking } from 'Apis/types';
import type { StoryId } from 'Modules/tray/modules/stories/model';
import type { TrayStore } from 'TrayStore';

/**
 * Compares two arrays of filter update statuses for equality.
 *
 * Returns `true` when both arrays contain the same entries (same filter IDs,
 * versions, and success flags), regardless of order.
 *
 * @param a - First status array.
 * @param b - Second status array.
 * @returns Whether the arrays represent the same update results.
 */
function filtersStatusesEqual(
    a: FilterUpdateStatus[],
    b: FilterUpdateStatus[],
): boolean {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((statusA) => {
        return b.some((statusB) => {
            return statusA.id === statusB.id
                && statusA.success === statusB.success
                && statusA.version === statusB.version;
        });
    });
}

/**
 * Store that manages tray home screen
 */
export class SettingsStore {
    /**
     * Previous filters update result, used to detect duplicate update responses.
     */
    private previousFiltersUpdateResult: FiltersStatus | null = null;

    public settings: GlobalSettings | null = null;

    /**
     * Bool describes if login item is enabled
     */
    public loginItemEnabled = true;

    /**
     * Indicates if the last update was more than seven days ago
     */
    public lastUpdateMoreSevenDays = false;

    /**
     * Advanced blocking status, used in What is Extra story
     */
    public advancedBlocking: AdvancedBlocking | null = null;

    /**
     * User License
     */
    public license = new TrayLicenseOrError({ error: true });

    /**
     * Bool describes if login item is enabled, undefined for pending
     */
    public newVersionAvailable: boolean | undefined = false;

    /**
     * Filters status
     */
    public filtersUpdating: boolean = false;

    /**
     * Filters update result
     */
    public filtersUpdateResult: FiltersStatus | null = null;

    /**
     * Filters metadata map for updates screen
     */
    public filtersMap: Filter[] | null = null;

    /**
     * Safari extensions store
     */
    public safariExtensionsStore = new SafariExtensionsStore();

    /**
     * Set of completed stories
     */
    public storyCompleted: Set<StoryId> = new Set();

    /**
     * Set of hidden story IDs, persisted via GlobalSettings
     */
    public hiddenStories: Set<StoryId> = new Set();

    /**
     * Trial availability status
     * Show available days for trial, if 0 - trial is not available
     */
    public trialAvailableDays = 0;

    /**
     * Statistics data
     */
    public statistics = new StatisticsResponse();

    /**
     * URL filter state for system-wide protection settings.
     */
    public urlFilterState = new URLFilterConfiguration({
        enabled: false,
        isNew: false,
        isPageNew: false,
    });

    /**
     * Checks if the license status is active or trial
     */
    public get isLicenseOrTrialActive() {
        return this.isLicenseActive || this.isTrialActive;
    }

    /**
     * Checks if the license is active
     */
    public get isLicenseActive() {
        return this.license.has_license && this.license.license.status === LicenseStatus.active;
    }

    /**
     * Checks if the trial is active
     */
    public get isTrialActive() {
        return this.license.has_license && this.license.license.status === LicenseStatus.trial;
    }

    /**
     * Checks if the license is bind
     */
    public get isLicenseBind() {
        return this.license.has_license && this.license.license.applicationKeyOwner;
    }

    /**
     * Checks if the app release variant is the MAS
     */
    public get isMASReleaseVariant() {
        return this.settings?.releaseVariant === ReleaseVariants.MAS;
    }

    /**
     * Ctor
     */
    public constructor(public rootStore: TrayStore) {
        this.rootStore = rootStore;
        makeAutoObservable(this, { rootStore: false }, { autoBind: true });
        this.getSettings();
        this.getStatistics();
        this.getTrayLicense();
        this.getSafariExtensions();
        this.getTrialAvailability();
        this.getAdvancedBlocking();
        this.getURLFilterState();
    }

    /**
     * Helper for update
     */
    private buildGlobalSettings() {
        if (this.settings) {
            return this.settings.clone();
        }
        return new GlobalSettings();
    }

    /**
     * Persist hidden stories
     */
    private persistHiddenStories() {
        if (!this.settings) {
            return;
        }
        const newValue = this.buildGlobalSettings();
        newValue.hiddenStories = [...this.hiddenStories];
        this.setSettings(newValue);
        window.API.Execute(new UpdateTraySettingsRequest(newValue));
    }

    /**
     * Setter for filters metadata
     */
    private setFilters(filters: Filters) {
        this.filtersMap = [...filters.filters, ...filters.customFilters];
    }

    /**
     * Getter for safari extensions with loading status
     */
    public getSafariExtensionsLoading() {
        return this.safariExtensionsStore.safariExtensionsLoading;
    }

    /**
     * Set completed story
     */
    public setCompletedStory(storyId: StoryId) {
        this.storyCompleted.add(storyId);
    }

    /**
     * Hide a story by ID and persist
     */
    public setHiddenStory(storyId: StoryId) {
        this.hiddenStories.add(storyId);
        this.persistHiddenStories();
    }

    /**
     * Restore all hidden stories and persist
     */
    public showAllHiddenStories() {
        this.hiddenStories.clear();
        this.persistHiddenStories();
    }

    /**
     * Get tray settings
     */
    public async getSettings() {
        const data = await window.API.Execute(new GetTraySettingsRequest());
        this.setSettings(data);
    }

    /**
     * Get statistics
     */
    public async getStatistics() {
        const data = await window.API.Execute(new GetStatisticsRequest({
            period: StatisticsPeriod.all,
        }));
        this.setStatistics(data);
    }

    /**
     * Get status of Advanced blocking
     */
    public async getAdvancedBlocking() {
        const data = await window.API.Execute(new GetAdvancedBlockingRequest());
        this.setAdvancedBlocking(data);
    }

    /**
     * Get URL filter state from swift
     */
    public async getURLFilterState() {
        const resp = await window.API.Execute(new GetURLFilterStateRequest());
        this.setURLFilterState(resp.configuration);
    }

    /**
     * URL filter state setter
     */
    public setURLFilterState(data: URLFilterConfiguration) {
        this.urlFilterState = data;
    }

    /**
     * Update SystemWideProtection setting
     */
    public enableSystemWideProtection() {
        const newConfiguration = this.urlFilterState.clone();
        newConfiguration.enabled = true;
        this.setURLFilterState(newConfiguration);
        window.API.Execute(new UpdateURLFilterConfigurationRequest(newConfiguration));
    }

    /**
     * Update tray settings
     */
    public async updateSettings(enabled: boolean) {
        const newValue = this.buildGlobalSettings();
        newValue.enabled = enabled;
        this.setSettings(newValue);
        await window.API.Execute(new UpdateTraySettingsRequest(newValue));
    }

    /**
     * Gets trial availability status
     */
    public async getTrialAvailability() {
        const { value } = await window.API.Execute(new GetTrialAvailableDaysRequest());
        this.setIsTrialAvailable(value);
    }

    /**
     * Start the process of checking filters updates
     */
    public checkFiltersUpdate() {
        this.getFiltersMetadata();

        window.API.Execute(new RequestFiltersUpdateRequest());

        this.filtersUpdateResult = null;
        this.filtersUpdating = true;
    }

    /**
     * Start the process of checking version updates
     */
    public checkApplicationVersion() {
        window.API.Execute(new CheckApplicationVersionRequest());
        this.newVersionAvailable = undefined;
    }

    /**
     * Force retry filters update
     */
    public tryAgainFiltersUpdate() {
        window.API.Execute(new RequestFiltersUpdateRequest());
        this.filtersUpdateResult = null;
        this.filtersUpdating = true;
    }

    /**
     * Set Settings of tray
     */
    public setSettings(settings: GlobalSettings) {
        this.settings = settings;
        this.newVersionAvailable = settings.newVersionAvailable;
        this.hiddenStories = new Set(settings.hiddenStories || []);
        this.loginItemEnabled = settings.loginItemEnabled;
        this.lastUpdateMoreSevenDays = settings.lastUpdateMoreSevenDays ?? false;
        log.setLogLevel(settings.debugLogging ? LogLevel.DBG : LogLevel.ERR);
        updateLanguage(settings.language);
    }

    /**
     * Setter for statistics
     */
    public setStatistics(statistics: StatisticsResponse) {
        this.statistics = statistics;
    }

    /**
     * Setter for AdvancedBlocking
     */
    public setAdvancedBlocking(advancedBlocking: AdvancedBlocking) {
        this.advancedBlocking = advancedBlocking;
    }

    /**
     * Set login item status
     */
    public setLoginItem(enabled: boolean) {
        this.loginItemEnabled = enabled;
    }

    /**
     * Set filters status
     *
     * Compares the new result against the previous one to detect duplicate
     * update responses. When the native side reports the same filters with
     * the same versions as the previous update, the result is treated as
     * "nothing to update" so the UI shows the up-to-date state instead of
     * repeating outdated update counts.
     */
    public setFiltersStatus(result: FiltersStatus) {
        this.filtersUpdating = false;

        if (this.previousFiltersUpdateResult
            && !result.error
            && filtersStatusesEqual(result.status, this.previousFiltersUpdateResult.status)
        ) {
            this.filtersUpdateResult = new FiltersStatus({ status: [], error: false });
            return;
        }

        this.previousFiltersUpdateResult = result;
        this.filtersUpdateResult = result;
    }

    /**
     * Filters data for updates
     */
    public async getFiltersMetadata() {
        const filters = await window.API.Execute(new GetFiltersMetadataRequest());
        this.setFilters(filters);
    }

    /**
     * Sets the trial availability status
     */
    public setIsTrialAvailable(value: number) {
        this.trialAvailableDays = value;
    }

    /**
     * Set application update status
     */
    public setNewVersionAvailable(newVersionAvailable: boolean) {
        this.newVersionAvailable = newVersionAvailable;
    }

    /**
     * Receive user current license
     */
    public async getTrayLicense() {
        const resp = await window.API.Execute(new GetTrayLicenseRequest());
        this.setLicense(resp);
    }

    /**
     * Local setter for license
     */
    public setLicense(license: TrayLicenseOrError) {
        this.license = license;
    }

    /**
     * Get safari protection status
     */
    public async getSafariExtensions() {
        const ext = await window.API.Execute(new GetSafariExtensionsRequest());
        this.setSafariExtensions(ext);
    }

    /**
     * Use to open paywall screen
     */
    public requestOpenPaywallScreen() {
        window.API.Execute(new OpenSettingsWindowRequest());
        window.API.Execute(new RequestOpenSettingsPageRequest({ value: 'paywall' }));
    }

    /**
     * Updates safari extension (facade to safariExtensionsStore)
     */
    public updateSafariExtension(data: SafariExtensionUpdate) {
        this.safariExtensionsStore.updateSafariExtension(data);
    }

    /**
     * Set safari protection status (facade to safariExtensionsStore)
     */
    public setSafariExtensions(data: SafariExtensions) {
        this.safariExtensionsStore.setSafariExtensions(data);
    }
}
