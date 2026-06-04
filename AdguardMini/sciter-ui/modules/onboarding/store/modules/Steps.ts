// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable, runInAction } from 'mobx';

import { UpdateConsentRequest } from 'Apis/requests/CommonService';
import { GetFiltersIndexRequest, GetFiltersMetadataRequest, UpdateFiltersRequest } from 'Apis/requests/FiltersService';
import { OnboardingDidCompleteRequest } from 'Apis/requests/OnboardingService';
import { GetSystemLanguageRequest, OpenSafariExtensionPreferencesRequest } from 'Apis/requests/SettingsService';
import { FiltersIndex, OptionalStringValue, FiltersUpdate, UserConsent } from 'Apis/types';
import { updateLanguage } from 'Intl';

import type { Filters, Filter } from 'Apis/types';

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

    private index = new FiltersIndex();

    private recommendedFiltersIdsByGroups: Record<string, number[]> = {};

    private _blockTrackers = false;

    private _blockAnnoyance = false;

    private _safariSettingsHaveBeenOpened = false;

    public skipTuning = false;

    public annoyanceFilters: Filter[] = [];

    public annoyanceHasBeenAccepted = false;

    public systemLanguage = 'en';

    /**
     * Returns the current onboarding step.
     */
    public get currentStep() {
        return this._currentStep;
    }

    /**
     * Whether Safari settings have been opened by the user.
     */
    public get safariSettingsHaveBeenOpened() {
        return this._safariSettingsHaveBeenOpened;
    }

    /**
     * Ctor
     */
    public constructor() {
        makeAutoObservable(this, undefined, { autoBind: true });
        this.getFiltersIndex();
        this.getSystemLanguage();
    }

    /**
     * Fetches the filters index from Swift and loads filter metadata.
     */
    private async getFiltersIndex() {
        const index = await window.API.Execute(new GetFiltersIndexRequest());
        runInAction(() => {
            this.setFiltersIndex(index);
        });
        this.getFilters();
    }

    /**
     * Parses the filters index and extracts recommended filters by group.
     *
     * @param index Filters index from the backend.
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
     * Fetches filter metadata from Swift.
     */
    private async getFilters() {
        const index = await window.API.Execute(new GetFiltersMetadataRequest());
        runInAction(() => {
            this.setAnnoyanceFilters(index);
        });
    }

    /**
     * Updates the annoyance filters list from the full filter collection.
     *
     * @param filters Full filters metadata.
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
     * Marks that the user has accepted the annoyance blocking consent.
     */
    private setAnnoyanceHasBeenAccepted() {
        this.annoyanceHasBeenAccepted = true;
    }

    /**
     * Updates the flag indicating whether Safari settings were opened.
     */
    private setSafariSettingsHasBeenOpened(flag: boolean) {
        this._safariSettingsHaveBeenOpened = flag;
    }

    /**
     * Enables the specified filter IDs via the Swift backend.
     *
     * @param ids Filter IDs to enable.
     */
    private async updateFilters(ids: number[]) {
        const filters = new FiltersUpdate({ ids, isEnabled: true });
        await window.API.Execute(new UpdateFiltersRequest(filters));
    }

    /**
     * Fetches the system language from Swift and applies it.
     */
    public async getSystemLanguage() {
        const ext = await window.API.Execute(new GetSystemLanguageRequest());
        runInAction(() => {
            this.setSystemLanguage(ext.value);
        });
    }

    /**
     * Updates the UI language and stores the system language code.
     *
     * @param data Language code string.
     */
    public setSystemLanguage(data: string) {
        updateLanguage(data);
        this.systemLanguage = data;
    }

    /**
     * Sets the current onboarding step.
     *
     * @param step The step to navigate to.
     */
    public setCurrentStep(step: OnboardingSteps) {
        this._currentStep = step;
    }

    /**
     * Opens Safari extension preferences and marks them as visited.
     */
    public async openSafariSettings() {
        await window.API.Execute(new OpenSafariExtensionPreferencesRequest(new OptionalStringValue()));
        runInAction(() => {
            this.setSafariSettingsHasBeenOpened(true);
        });
    }

    /**
     * Handles the user's tracker blocking choice and advances to annoyances step.
     *
     * @param state Whether trackers should be blocked.
     */
    public async shouldBlockTrackers(state: boolean) {
        this._blockTrackers = state;
        this.setCurrentStep(OnboardingSteps.annoyances);
    }

    /**
     * Sets whether the user chose to skip filter tuning.
     *
     * @param state Whether tuning is skipped.
     */
    public setSkipTuning(state: boolean) {
        this.skipTuning = state;
    }

    /**
     * Handles the user's annoyance blocking choice and advances to finish.
     *
     * @param state Whether annoyances should be blocked.
     */
    public async shouldBlockAnnoyances(state: boolean) {
        this._blockAnnoyance = state;
        if (state) {
            this.setAnnoyanceHasBeenAccepted();
        }
        this.setCurrentStep(OnboardingSteps.finish);
    }

    /**
     * Skips the remaining onboarding steps and goes to finish.
     */
    public async skipOnboarding() {
        this.setCurrentStep(OnboardingSteps.finish);
    }

    /**
     * Completes onboarding by enabling selected filters and recording consent.
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
