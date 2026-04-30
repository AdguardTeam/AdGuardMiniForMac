// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable } from 'mobx';

import { GetFiltersIndexRequest, GetFiltersMetadataRequest, UpdateFiltersRequest } from 'Apis/requests/FiltersService';
import { GetSafariExtensionsRequest, GetSystemLanguageRequest, OpenSafariExtensionPreferencesRequest, UpdateConsentRequest } from 'Apis/requests/SettingsService';
import { OnboardingDidCompleteRequest } from 'Apis/requests/OnboardingService';
import { FiltersIndex, OptionalStringValue, FiltersUpdate, UserConsent } from 'Apis/types';
import { SafariExtensionsStore } from 'Common/stores/SafariExtensionsStore';
import { updateLanguage } from 'Intl';

import type { OnboardingStore } from '../store';
import type { Filters, Filter, SafariExtensions } from 'Apis/types';

export enum OnboardingSteps {
    start = 'start',
    extensions = 'extensions',
    ads = 'ads',
    trackers = 'trackers',
    annoyances = 'annoyances',
    finish = 'finish',
}

/**
 * Steps store
 */
export class Steps {
    private _currentStep = OnboardingSteps.start;

    /**
     * Use for navigating with back arrow
     * When user skip tuning and come to finish screen, back arrow should return to start of tuning
     */
    public skipTuning = false;

    private index = new FiltersIndex();

    private recommendedFiltersIdsByGroups: Record<string, number[]> = {};

    public annoyanceFilters: Filter[] = [];

    public annoyanceHasBeenAccepted = false;

    /**
     * Property for checking if user selected to block trackers
     */
    private _blockTrackers = false;

    /**
     * Property for checking if user selected to block Annoyance
     */
    private _blockAnnoyance = false;

    /**
     * Safari extensions store
     */
    public safariExtensionsStore = new SafariExtensionsStore();

    /**
     * Whether all safari extensions are enabled (delegated to store)
     */
    public get allExtensionsEnabled() {
        return this.safariExtensionsStore.allExtensionsEnabled;
    }

    /**
     * System language
     */
    public systemLanguage = 'en';

    /**
     * Current onboarding step
     */
    public get currentStep() {
        return this._currentStep;
    }

    private _safariSettingsHaveBeenOpened = false;

    /**
     * Indicates whether the Safari settings have been opened or not
     */
    public get safariSettingsHaveBeenOpened() {
        return this._safariSettingsHaveBeenOpened;
    }

    /**
     * Ctor
     */
    public constructor(private readonly rootStore: OnboardingStore) {
        makeAutoObservable(this, undefined, { autoBind: true });
        this.getFiltersIndex();
        this.getSafariExtensions();
        this.getSystemLanguage();
    }

    /**
     * Get filters index to enable specific filters on steps
     */
    private async getFiltersIndex() {
        const index = await window.API.Execute(new GetFiltersIndexRequest());
        this.setFiltersIndex(index);
        this.getFilters();
    }

    /**
     * Get safari protection status
     */
    public async getSafariExtensions() {
        const ext = await window.API.Execute(new GetSafariExtensionsRequest());
        this.setSafariExtensions(ext);
    }

    /**
     * Set safari protection status (delegated to safariExtensionsStore)
     */
    public setSafariExtensions(data: SafariExtensions) {
        this.safariExtensionsStore.setSafariExtensions(data);
    }

    /**
     * Get system language
     */
    public async getSystemLanguage() {
        const ext = await window.API.Execute(new GetSystemLanguageRequest());
        this.setSystemLanguage(ext.value);
    }

    /**
     * Set safari protection status
     */
    public setSystemLanguage(data: string) {
        updateLanguage(data);
        this.systemLanguage = data;
    }

    /**
     * Setter for filters index
     */
    private setFiltersIndex(index: FiltersIndex) {
        this.index = index;
        const recommendedFiltersByGroup: typeof this.recommendedFiltersIdsByGroups = {};
        index.recommendedFiltersIdsByGroupDict.forEach((v, k) => {
            recommendedFiltersByGroup[k] = v.ids;
        });
        this.recommendedFiltersIdsByGroups = recommendedFiltersByGroup;
    }

    /**
     * Get filters index to enable specific filters on steps
     */
    private async getFilters() {
        const index = await window.API.Execute(new GetFiltersMetadataRequest());
        this.setAnnoyanceFilters(index);
    }

    /**
     * Setter Annoyance for filters for consent show
     */
    private setAnnoyanceFilters(filters: Filters) {
        const annoyanceFiltersIds = [
            this.index.cookieNoticeFilterId,
            this.index.otherAnnoyanceFilterId,
            this.index.popUpsFilterId,
            this.index.widgetsFilterId,
            this.index.mobileBannersFilter,
        ];
        this.annoyanceFilters = filters.filters.filter((f) => annoyanceFiltersIds.includes(f.id));
    }

    /**
     * Setter for annoyanceHasBeenAccepted to not show twice
     */
    private setAnnoyanceHasBeenAccepted() {
        this.annoyanceHasBeenAccepted = true;
    }

    /**
     * Set current onboarding step
     */
    public setCurrentStep(step: OnboardingSteps) {
        this._currentStep = step;
    }

    /**
     * Opens the Safari settings
     */
    public async openSafariSettings() {
        await window.API.Execute(new OpenSafariExtensionPreferencesRequest(new OptionalStringValue()));
        this.setSafariSettingsHasBeenOpened(true);
    }

    /**
     * Updates the value of '_safariSettingsHaveBeenOpened' based on the provided boolean flag
     */
    private setSafariSettingsHasBeenOpened(flag: boolean) {
        this._safariSettingsHaveBeenOpened = flag;
    }

    /**
     * Common function for filters update
     */
    private async updateFilters(ids: number[]) {
        const filters = new FiltersUpdate({ ids, isEnabled: true });
        await window.API.Execute(new UpdateFiltersRequest(filters));
    }

    /**
     * Sets the preference for blocking trackers
     */
    public async shouldBlockTrackers(state: boolean) {
        this._blockTrackers = state;
        this.setCurrentStep(OnboardingSteps.annoyances);
    }

    /**
     * Use for navigating with back arrow
     * When user skip tuning and come to finish screen, back arrow should return to start of tuning
     */
    public setSkipTuning(state: boolean) {
        this.skipTuning = state;
    }

    /**
     * Sets the preference for blocking annoyances
     */
    public async shouldBlockAnnoyances(state: boolean) {
        this._blockAnnoyance = state;
        if (state) {
            this.setAnnoyanceHasBeenAccepted();
        }
        this.setCurrentStep(OnboardingSteps.finish);
    }

    /**
     * Skips the onboarding
     */
    public async skipOnboarding() {
        this.setCurrentStep(OnboardingSteps.finish);
    }

    /**
     * Completes the onboarding
     */
    public async completeOnboarding() {
        if (this._blockTrackers) {
            await this.updateFilters(this.recommendedFiltersIdsByGroups[this.index.definedGroups.privacy]);
        }
        const ids = [
            this.index.cookieNoticeFilterId,
            this.index.popUpsFilterId,
            this.index.widgetsFilterId,
            this.index.otherAnnoyanceFilterId,
            this.index.mobileBannersFilter,
            ...(this.index.recommendedFiltersIdsByGroupDict.get(this.index.definedGroups.socialWidgets)?.ids || []),
        ];
        if (this._blockAnnoyance) {
            await this.updateFilters(ids);
        }
        if (this.annoyanceHasBeenAccepted) {
            await window.API.Execute(new UpdateConsentRequest(new UserConsent({ filtersIds: ids })));
        }
        await window.API.Execute(new OnboardingDidCompleteRequest());
    }
}
