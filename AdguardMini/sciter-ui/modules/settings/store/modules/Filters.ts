// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable, observable, runInAction } from 'mobx';

import { ConfirmAddCustomFilterRequest, DeleteCustomFiltersRequest, GetEnabledFiltersIdsRequest, GetFiltersGroupedByExtensionsRequest, GetFiltersIndexRequest, GetFiltersMetadataRequest, UpdateCustomFilterRequest, UpdateFiltersRequest, UpdateLanguageSpecificRequest } from 'Apis/requests/FiltersService';
import {
    FiltersGroupedByExtensions,
    Filters as FiltersEnt,
    FiltersIndex,
    FiltersUpdate,
} from 'Apis/types';

import type { Filter } from 'Apis/types';
import type { SettingsStore } from 'SettingsStore';

/**
 * Filters store
 */
export class Filters {
    private readonly filtersMarkedForDeletion: Map<Filter['id'], Filter> = new Map();

    public rootStore: SettingsStore;

    public filters = new FiltersEnt();

    public enabledFilters = new Set<number>();

    public filtersMap = observable.map<number, Filter>(new Map<number, Filter>(), { deep: false });

    public filtersIndex = new FiltersIndex();

    public recommendedFiltersByGroups: Record<string, number[]> = {};

    public otherFiltersByGroups: Record<string, number[]> = {};

    public filtersByGroups: Record<string, number[]> = {};

    public filtersGroupedByExtension: FiltersGroupedByExtensions = new FiltersGroupedByExtensions();

    public filtersIdsWithConsent: number[] = [];

    public languageSpecific: boolean = false;

    public customFiltersSubscribeURL: string = '';

    /**
     * Ctor
     *
     * @param rootStore
     */
    public constructor(rootStore: SettingsStore) {
        this.rootStore = rootStore;
        makeAutoObservable(this, {
            rootStore: false,
        }, { autoBind: true });
    }

    /**
     * Updates local filters map with the provided filter
     *
     * @param filter filter to update in the map
     */
    private localUpdateFilter(filter: Filter) {
        if (filter.id) {
            this.filtersMap.set(filter.id, filter);
        }
    }

    /**
     * Delete custom filters
     */
    private async deleteCustomFilters(filtersIds: Filter['id'][]) {
        const error = await window.API.Execute(new DeleteCustomFiltersRequest({ filtersIds }));

        if (error.hasError) {
            return error;
        }
        this.fetchFilters();

        // TODO: Debounce is not working properly due to sciter.
    }

    /**
     * Get filters settings from swift
     */
    public async getFilters() {
        const resp = await window.API.Execute(new GetFiltersMetadataRequest());
        this.setFilters(resp);
    }

    /**
     * Get enabled filters ids
     */
    public async getEnabledFilters() {
        const resp = await window.API.Execute(new GetEnabledFiltersIdsRequest());
        this.setEnabledFilters(resp.ids);
    }

    /**
     * Fetch filters
     */
    public fetchFilters() {
        this.getEnabledFilters();
        this.getFilters();
    }

    /**
     * Setter fo enabled filters ids
     */
    public setEnabledFilters(ids: number[]) {
        this.enabledFilters = new Set(ids);
    }

    /**
     * Setter fo enabled filters ids
     */
    public updateLocalEnabledFilters(ids: number[], isEnabled: boolean) {
        const newValue = new Set(this.enabledFilters);
        ids.forEach((id) => {
            if (isEnabled) {
                newValue.add(id);
            } else {
                newValue.delete(id);
            }
        });
        this.enabledFilters = newValue;
    }

    /**
     * Get filters index from swift
     */
    public async getFiltersIndex() {
        const index = await window.API.Execute(new GetFiltersIndexRequest());
        this.setIndex(index);
    }

    /**
     * Setter for filters index
     */
    public setIndex(data: FiltersIndex) {
        this.filtersIndex = data;
        const recommendedFiltersByGroup: typeof this.recommendedFiltersByGroups = {};
        data.recommendedFiltersIdsByGroupDict.forEach((filters, groupId) => {
            recommendedFiltersByGroup[groupId] = filters.ids;
        });
        this.recommendedFiltersByGroups = recommendedFiltersByGroup;

        const otherFiltersByGroups: typeof this.otherFiltersByGroups = {};
        data.otherFiltersIdsByGroupDict.forEach((filters, groupId) => {
            otherFiltersByGroups[groupId] = filters.ids;
        });
        this.otherFiltersByGroups = otherFiltersByGroups;

        this.filtersIdsWithConsent = [
            data.cookieNoticeFilterId,
            data.otherAnnoyanceFilterId,
            data.popUpsFilterId,
            data.widgetsFilterId,
            ...recommendedFiltersByGroup[data.definedGroups.annoyances],
            ...otherFiltersByGroups[data.definedGroups.annoyances],
        ];

        const filtersByGroups: typeof this.filtersByGroups = {};
        data.filtersByGroups.forEach((filters, groupId) => {
            filtersByGroups[groupId] = filters.ids;
        });
        this.filtersByGroups = filtersByGroups;
    }

    /**
     * Switcher for safari protection page
     */
    public async switchFiltersState(ids: number[], isEnabled: boolean) {
        try {
            const prevState = Array.from(this.enabledFilters);
            this.updateLocalEnabledFilters(ids, isEnabled);

            const data = new FiltersUpdate({ ids, isEnabled });
            const hasError = await window.API.Execute(new UpdateFiltersRequest(data));

            if (hasError.hasError) {
                runInAction(() => {
                    this.setEnabledFilters(prevState);
                });
                return hasError;
            }
        } catch (err) {
            log.error('switchFiltersState failed', String(err));
        }
    }

    /**
     * Setter for filters
     */
    public setFilters(filters: FiltersEnt) {
        const filtersIdsMarkedForDeletion = [...this.filtersMarkedForDeletion.keys()];

        filters.customFilters = filters.customFilters
            .filter(({ id }) => !filtersIdsMarkedForDeletion.includes(id));

        this.filters = filters;
        this.languageSpecific = filters.languageSpecific;

        filters.filters.forEach((f) => {
            this.filtersMap.set(f.id, f);
        });
        filters.customFilters.forEach((f) => {
            this.filtersMap.set(f.id, f);
        });
    }

    /**
     * Updates custom filter info
     *
     * @param filterId
     * @param title
     * @param isTrusted
     */
    public async updateCustomFilter(filterId: number, title: string, isTrusted: boolean) {
        try {
            const error = await window.API.Execute(new UpdateCustomFilterRequest({
                filterId, title, isTrusted,
            }));
            if (error.hasError) { return error; }
            const filter = this.filtersMap.get(filterId);
            if (filter) {
                filter.title = title;
                filter.trusted = isTrusted;
                this.localUpdateFilter(filter);
            }
            this.fetchFilters();
        } catch (err) {
            log.error('updateCustomFilter failed', String(err));
        }
    }

    /**
     * Prepares custom filters for deletion by marking them as such and allowing undo or confirm delete action.
     *
     * @param {Filter[]} [filters] - The filters to prepare for deletion. If not provided,
     * all custom filters will be used.
     * @returns {Object} An object with two methods:
     *   - `undoDelete`: Restores the filters marked for deletion back to the filter list.
     *   - `confirmDelete`: Permanently deletes the filters unless the undo action was invoked.
     */
    public prepareCustomFiltersForDeletion(filters?: Filter[]) {
        let undoDeleteActionInvoked = false;

        const filtersToDelete = filters ?? this.filters.customFilters;

        const filtersIds = filtersToDelete.map((filter) => filter.id);

        runInAction(() => {
            filtersToDelete.forEach((filter) => {
                this.filtersMarkedForDeletion.set(filter.id, filter);
            });
        });

        this.setFilters(new FiltersEnt(this.filters));

        return {
            undoDelete: () => {
                undoDeleteActionInvoked = true;

                const restoredFilters = new FiltersEnt(this.filters);

                runInAction(() => {
                    filtersToDelete.forEach((filter) => {
                        const filterMarkedForDeletion = this.filtersMarkedForDeletion.get(filter.id);
                        if (filterMarkedForDeletion) {
                            restoredFilters.customFilters.unshift(filterMarkedForDeletion);
                            this.filtersMarkedForDeletion.delete(filter.id);
                        }
                    });
                });

                this.setFilters(restoredFilters);
            },
            confirmDelete: async () => {
                if (!undoDeleteActionInvoked) {
                    runInAction(() => {
                        filtersIds.forEach((id) => {
                            this.filtersMarkedForDeletion.delete(id);
                        });
                    });

                    return this.deleteCustomFilters(filtersIds);
                }
            },
        };
    }

    /**
     * Add custom filter
     */
    public async addCustomFilter(url: string, title: string, isTrusted: boolean) {
        try {
            const error = await window.API.Execute(new ConfirmAddCustomFilterRequest({
                url, title, trusted: isTrusted,
            }));
            if (error.hasError) {
                return error;
            }
            this.fetchFilters();
        } catch (err) {
            log.error('addCustomFilter failed', String(err));
        }
    }

    /**
     * Request info of enabled filters divided by extensions
     */
    public async getFiltersGroupedByExtension() {
        const data = await window.API.Execute(new GetFiltersGroupedByExtensionsRequest());
        this.setFiltersGroupedByExtension(data);
    }

    /**
     * Setter for FiltersGroupedByExtensions
     */
    public setFiltersGroupedByExtension(data: FiltersGroupedByExtensions) {
        this.filtersGroupedByExtension = data;
    }

    /**
     * Update language specific value
     * @param value bool - current value of language specific
     */
    public updateLanguageSpecific(value: boolean) {
        window.API.Execute(new UpdateLanguageSpecificRequest({ value }));
        this.languageSpecific = value;
    }

    /**
     * Setter for CustomFiltersSubscribeURL
     * @param url string - current value of custom filters subscribe URL
     */
    public setCustomFiltersSubscribeURL(url: string) {
        this.customFiltersSubscribeURL = url;
    }

    // ---- SafariProtection health-check computed properties (merged from SafariProtection) ----

    /**
     * Get all enabled filters Ids
     */
    public get enabledFiltersArray() {
        return Array.from(this.enabledFilters);
    }

    /**
     * Value for block ads
     */
    public get blockAds() {
        const definedGroups = this.filtersIndex.definedGroups || {};
        return !!this.recommendedFiltersByGroups[definedGroups.adBlocking]?.every(
            (id) => this.enabledFilters.has(id),
        );
    }

    /**
     * Value for search ads
     */
    public get blockSearchAds() {
        return !this.enabledFilters.has(this.filtersIndex.unblockSearchAdsFilterId);
    }

    /**
     * Value for language specific
     */
    public get languageSpecificEnabled() {
        const definedGroups = this.filtersIndex.definedGroups || {};
        return !!this.recommendedFiltersByGroups[definedGroups.languageSpecific]?.find(
            (id) => this.enabledFilters.has(id),
        );
    }

    /**
     * Value for block trackers
     */
    public get blockTrackers() {
        const definedGroups = this.filtersIndex.definedGroups || {};
        return !!this.recommendedFiltersByGroups[definedGroups.privacy]?.every(
            (id) => this.enabledFilters.has(id),
        );
    }

    /**
     * Value for block social buttons
     */
    public get blockSocialButtons() {
        const definedGroups = this.filtersIndex.definedGroups || {};
        return !!this.recommendedFiltersByGroups[definedGroups.socialWidgets]?.every(
            (id) => this.enabledFilters.has(id),
        );
    }

    /**
     * Value for block cookie notice
     */
    public get blockCookieNotice() {
        return this.enabledFilters.has(this.filtersIndex.cookieNoticeFilterId);
    }

    /**
     * Value for block pop ups
     */
    public get blockPopups() {
        return this.enabledFilters.has(this.filtersIndex.popUpsFilterId);
    }

    /**
     * Value for block widgets
     */
    public get blockWidgets() {
        return this.enabledFilters.has(this.filtersIndex.widgetsFilterId);
    }

    /**
     * Value for block other annoyance
     */
    public get blockOtherAnnoyance() {
        return this.enabledFilters.has(this.filtersIndex.otherAnnoyanceFilterId);
    }

    /**
     * Enabled custom filters count
     */
    public get enabledCustomFiltersCount() {
        const enabledCustomFilters = this.filters.customFilters.filter(({ enabled }) => enabled);
        return enabledCustomFilters.length;
    }

    // ---- SafariProtection actions (merged from SafariProtection) ----

    /**
     * Update blockAds in safari protection
     */
    public async updateBlockAds(value: boolean) {
        const definedGroups = this.filtersIndex.definedGroups || {};
        return this.switchFiltersState(
            this.recommendedFiltersByGroups[definedGroups.adBlocking],
            value,
        );
    }

    /**
     * Update blockSearchAds in safari protection
     */
    public async updateBlockSearchAds(value: boolean) {
        return this.switchFiltersState(
            [this.filtersIndex.unblockSearchAdsFilterId],
            !value,
        );
    }

    /**
     * Update blockTrackers in safari protection
     */
    public async updateBlockTrackers(value: boolean) {
        const definedGroups = this.filtersIndex.definedGroups || {};
        return this.switchFiltersState(
            this.recommendedFiltersByGroups[definedGroups.privacy],
            value,
        );
    }

    /**
     * Update blockSocialButtons in safari protection
     */
    public async updateBlockSocialButtons(value: boolean) {
        const definedGroups = this.filtersIndex.definedGroups || {};
        return this.switchFiltersState(
            this.recommendedFiltersByGroups[definedGroups.socialWidgets],
            value,
        );
    }

    /**
     * Update blockCookieNotice in safari protection
     */
    public async updateBlockCookieNotice(value: boolean) {
        return this.switchFiltersState(
            [this.filtersIndex.cookieNoticeFilterId],
            value,
        );
    }

    /**
     * Update blockPopups in safari protection
     */
    public async updateBlockPopups(value: boolean) {
        return this.switchFiltersState(
            [this.filtersIndex.popUpsFilterId],
            value,
        );
    }

    /**
     * Update blockWidgets in safari protection
     */
    public async updateBlockWidgets(value: boolean) {
        return this.switchFiltersState(
            [this.filtersIndex.widgetsFilterId],
            value,
        );
    }

    /**
     * Update blockOther in safari protection
     */
    public async updateBlockOther(value: boolean) {
        return this.switchFiltersState(
            [this.filtersIndex.otherAnnoyanceFilterId],
            value,
        );
    }

    /**
     * Resets safari protection
     */
    public resetSafariProtection() {
        // TODO: AG-XXXX
    }
}
