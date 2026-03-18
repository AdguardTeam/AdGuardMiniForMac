// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { LogLevel } from '@adg/sciter-utils-kit';
import { makeAutoObservable } from 'mobx';

import { EmptyValue, GlobalSettings, LicenseOrError, LicenseStatus, ReleaseVariants, SafariExtensions, SafariExtensionStatus, SafariExtensionType, StringValue } from 'Apis/types';
import { updateLanguage } from 'Intl';

import type { Filters, Filter, FiltersStatus, SafariExtensionUpdate, SafariExtension, AdvancedBlocking } from 'Apis/types';
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
    * Safari extension status
    */
    public safariExtensions = new SafariExtensions();

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
     * Get count of safari extensions
     */
    public get safariExtensionsCount() {
        return Object.values(this.safariExtensions.toObject()).filter((el) => typeof el !== 'boolean').length;
    }

    /**
     * Get count of enabled safari extensions
     */
    public get enabledSafariExtensionsCount() {
        const extensions = Object.values(this.safariExtensions.toObject()).filter((el) => typeof el !== 'boolean') as ReturnType<SafariExtension['toObject']>[];

        if (this.safariExtensions.allExtensionsEnabled) {
            return extensions.length;
        }
        return extensions.reduce((count, ent) => {
            if (ent.status && ent.status !== SafariExtensionStatus.disabled) {
                // eslint-disable-next-line no-param-reassign
                count++;
            }
            return count;
        }, 0);
    }

    /**
     *
     */
    public constructor(public rootStore: TrayStore) {
        this.rootStore = rootStore;
        makeAutoObservable(this, { rootStore: false }, { autoBind: true });
        this.getSettings();
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
            newValue.allExtensionEnabled = this.settings.allExtensionEnabled;
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
        const exts = Object.values(this.safariExtensions.toObject())
            .filter((ent) => typeof ent === 'object' && ent.status === SafariExtensionStatus.loading);
        return exts;
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
        const data = await window.API.settingsService.GetTraySettings(new EmptyValue());
        this.setSettings(data);
    }

    /**
     * Get status of Advanced blocking
     */
    public async getAdvancedBlocking() {
        const data = await window.API.advancedBlockingService.GetAdvancedBlocking(new EmptyValue());
        this.setAdvancedBlocking(data);
    }

    /**
     * Update tray settings
     */
    public async updateSettings(enabled: boolean) {
        const newValue = this.buildGlobalSettings();
        newValue.enabled = enabled;
        this.setSettings(newValue);
        await window.API.settingsService.UpdateTraySettings(newValue);
    }

    /**
     * Gets trial availability status
     */
    public async getTrialAvailability() {
        const { value } = await window.API.accountService.GetTrialAvailableDays(new EmptyValue());
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

        window.API.filtersService.RequestFiltersUpdate(new EmptyValue());

        this.lastTimeUpdate = Date.now();

        this.filtersUpdateResult = null;
        this.filtersUpdating = true;
    }

    /**
     * Start the process of checking version updates
     */
    public checkApplicationVersion() {
        window.API.settingsService.CheckApplicationVersion(new EmptyValue());
        this.newVersionAvailable = undefined;
    }

    /**
     * Force retry filters update
     */
    public tryAgainFiltersUpdate() {
        window.API.filtersService.RequestFiltersUpdate(new EmptyValue());
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
        const filters = await window.API.filtersService.GetFiltersMetadata(new EmptyValue());
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
        const resp = await window.API.accountService.GetLicense(new EmptyValue());
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
        const ext = await window.API.settingsService.GetSafariExtensions(new EmptyValue());
        this.setSafariExtensions(ext);
    }

    /**
     * Use to open paywall screen
     */
    public requestOpenPaywallScreen() {
        window.API.internalService.OpenSettingsWindow(new EmptyValue());
        window.API.settingsService.RequestOpenSettingsPage(new StringValue({ value: 'paywall' }));
    }

    /**
     * Updates safari extension
     */
    public updateSafariExtension(data: SafariExtensionUpdate) {
        const newState = new SafariExtensions();
        newState.adguardForSafari = this.safariExtensions.adguardForSafari;
        newState.custom = this.safariExtensions.custom;
        newState.general = this.safariExtensions.general;
        newState.other = this.safariExtensions.other;
        newState.privacy = this.safariExtensions.privacy;
        newState.security = this.safariExtensions.security;
        newState.social = this.safariExtensions.social;
        newState.allExtensionsEnabled = this.safariExtensions.allExtensionsEnabled;

        switch (data.type) {
            case SafariExtensionType.adguard_for_safari:
                newState.adguardForSafari = data.state;
                break;
            case SafariExtensionType.custom:
                newState.custom = data.state;
                break;
            case SafariExtensionType.general:
                newState.general = data.state;
                break;
            case SafariExtensionType.other:
                newState.other = data.state;
                break;
            case SafariExtensionType.privacy:
                newState.privacy = data.state;
                break;
            case SafariExtensionType.security:
                newState.security = data.state;
                break;
            case SafariExtensionType.social:
                newState.social = data.state;
                break;
        }

        this.setSafariExtensions(newState);
    }

    /**
     * Set safari protection status
     */
    public setSafariExtensions(data: SafariExtensions) {
        this.safariExtensions = data;
    }
}
