// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { LogLevel } from '@adg/sciter-utils-kit';
import { makeAutoObservable } from 'mobx';

import { CheckApplicationVersionRequest, GetSafariExtensionsRequest, GetStatisticsRequest, GetTraySettingsRequest, RequestOpenSettingsPageRequest, UpdateTraySettingsRequest } from 'Apis/requests/SettingsService';
import { GetAdvancedBlockingRequest } from 'Apis/requests/AdvancedBlockingService';
import { GetLicenseRequest, GetTrialAvailableDaysRequest } from 'Apis/requests/AccountService';
import { GetFiltersMetadataRequest, RequestFiltersUpdateRequest } from 'Apis/requests/FiltersService';
import { OpenSettingsWindowRequest } from 'Apis/requests/InternalService';
import { GlobalSettings, LicenseOrError, LicenseStatus, ReleaseVariants, StatisticsPeriod, StatisticsResponse } from 'Apis/types';
import { SafariExtensionsStore } from 'Common/stores/SafariExtensionsStore';
import { updateLanguage } from 'Intl';

import type { Filters, Filter, FiltersStatus, SafariExtensionUpdate, AdvancedBlocking, SafariExtensions } from 'Apis/types';
import type { StoryId } from 'Modules/tray/modules/stories/model';
import type { TrayStore } from 'TrayStore';

const FILTERS_UPDATE_INTERVAL = 5 * 60 * 1000;

/**
 * Store that manages tray home screen
 */
export class SettingsStore {
    public settings: GlobalSettings | null = null;

    /**
     * Bool describes if login item is enabled
     */
    public loginItemEnabled = true;

    /**
     * Advanced blocking status, used in What is Extra story
     */
    public advancedBlocking: AdvancedBlocking | null = null;

    /**
     * User License
     */
    public license = new LicenseOrError({ error: true });

    /**
     * Debouncer for update checking
     */
    private lastTimeUpdate: number | undefined;

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
     * Trial availability status
     * Show available days for trial, if 0 - trial is not available
     */
    public trialAvailableDays = 0;

    /**
     * Statistics data
     */
    public statistics = new StatisticsResponse();

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
        this.getLicense();
        this.getSafariExtensions();
        this.getTrialAvailability();
        this.getAdvancedBlocking();
    }

    /**
     * Helper for update
     */
    private buildGlobalSettings() {
        const newValue = new GlobalSettings();
        if (this.settings) {
            newValue.enabled = this.settings.enabled;
            newValue.newVersionAvailable = this.settings.newVersionAvailable;
            newValue.releaseVariant = this.settings.releaseVariant;
            newValue.language = this.settings.language;
            newValue.debugLogging = this.settings.debugLogging;
            newValue.allowTelemetry = this.settings.allowTelemetry;
            newValue.theme = this.settings.theme;
        }
        return newValue;
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
        if (Date.now() < (this.lastTimeUpdate || 0) + FILTERS_UPDATE_INTERVAL) {
            return;
        }
        this.getFiltersMetadata();

        window.API.Execute(new RequestFiltersUpdateRequest());

        this.lastTimeUpdate = Date.now();

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
     */
    public setFiltersStatus(result: FiltersStatus) {
        this.filtersUpdating = false;
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
    public async getLicense() {
        const resp = await window.API.Execute(new GetLicenseRequest());
        this.setLicense(resp);
    }

    /**
     * Local setter for license
     */
    public setLicense(license: LicenseOrError) {
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
