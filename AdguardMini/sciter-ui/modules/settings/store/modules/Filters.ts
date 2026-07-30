// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { runInAction, makeObservable, observable, action, override } from 'mobx';

import {
    ConfirmAddCustomFilterRequest,
    DeleteCustomFiltersRequest,
    GetFiltersGroupedByExtensionsRequest,
    UpdateCustomFilterRequest,
    UpdateFiltersRequest,
    UpdateLanguageSpecificRequest,
} from 'Apis/requests/FiltersService';
import {
    FiltersGroupedByExtensions,
    Filters as FiltersEnt,
    FiltersUpdate,
} from 'Apis/types';
import { FiltersData } from 'Common/stores/FiltersData';

import type { Filter, FiltersIndex } from 'Apis/types';

/**
 * Full Filters store for the Settings module.
 */
export class Filters extends FiltersData {
    public readonly filtersMarkedForDeletion: Map<Filter['id'], Filter> = new Map();

    /**
     * Other (non-recommended) filter IDs keyed by group ID string.
     * Derived from `filtersIndex` inside `setIndex`.
     */
    public otherFiltersByGroups: Record<string, number[]> = {};

    /**
     * All filter IDs keyed by group ID string. Derived from
     * `filtersIndex` inside `setIndex`.
     */
    public filtersByGroups: Record<string, number[]> = {};

    /**
     * Enabled filters grouped by Safari extension, used by the
     * Settings UI to display per-extension rule counts.
     */
    public filtersGroupedByExtension: FiltersGroupedByExtensions = new FiltersGroupedByExtensions();

    /**
     * Filter IDs that require telemetry consent to enable
     * (spam/annoyance filters).
     */
    public filtersIdsWithConsent: number[] = [];

    /**
     * Whether language-specific filters are enabled.
     */
    public languageSpecific: boolean = false;

    /**
     * Custom filters subscribe URL, stored on the store for the
     * Settings-side Filters route.
     */
    public customFiltersSubscribeURL: string = '';

    /**
     * Ctor
     */
    public constructor() {
        super();
        makeObservable(this, {
            localUpdateFilter: action,
            deleteCustomFilters: action,
            // `setFilters` and `setIndex` override the parent `FiltersData`
            // members already annotated as `action`. Re-annotating them with
            // `action` throws in MobX (re-annotation is not allowed), so the
            // documented `override` annotation is used for overridden members.
            setFilters: override,
            setIndex: override,
            updateLocalEnabledFilters: action,
            switchFiltersState: action,
            updateCustomFilter: action,
            prepareCustomFiltersForDeletion: action,
            addCustomFilter: action,
            getFiltersGroupedByExtension: action,
            filtersMarkedForDeletion: observable,
            otherFiltersByGroups: observable,
            filtersByGroups: observable,
            filtersGroupedByExtension: observable,
            filtersIdsWithConsent: observable,
            languageSpecific: observable,
            customFiltersSubscribeURL: observable,
            setFiltersGroupedByExtension: action,
            updateLanguageSpecific: action,
            setCustomFiltersSubscribeURL: action,
        });
    }

    /**
     * Updates local filters map with the provided filter.
     *
     * @param filter Filter to update in the map.
     */
    public localUpdateFilter(filter: Filter) {
        if (filter.id) {
            this.filtersMap.set(filter.id, filter);
        }
    }

    /**
     * Delete custom filters by ID.
     * @param filtersIds IDs of the custom filters to delete.
     */
    public async deleteCustomFilters(filtersIds: Filter['id'][]) {
        const error = await window.API.Execute(new DeleteCustomFiltersRequest({ filtersIds }));

        if (error.hasError) {
            return error;
        }
        this.fetchFilters();

        // TODO: Debounce is not working properly due to sciter.
    }

    // ------------------------------------------------------------------
    // Overrides for extra derived-state population
    // ------------------------------------------------------------------

    /**
     * {@inheritDoc FiltersData.setFilters}
     *
     * Overrides to additionally filter out custom filters marked for
     * deletion and store `languageSpecific`.
     */
    public setFilters(filtersEnt: FiltersEnt) {
        const filtersIdsMarkedForDeletion = [...this.filtersMarkedForDeletion.keys()];

        filtersEnt.customFilters = filtersEnt.customFilters
            .filter(({ id }) => !filtersIdsMarkedForDeletion.includes(id));

        super.setFilters(filtersEnt);
        this.languageSpecific = filtersEnt.languageSpecific;
    }

    /**
     * {@inheritDoc FiltersData.setIndex}
     * Overrides to additionally derive `otherFiltersByGroups`,
     * `filtersIdsWithConsent`, and `filtersByGroups`.
     */
    public setIndex(data: FiltersIndex) {
        super.setIndex(data);

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
            ...this.recommendedFiltersByGroups[data.definedGroups.annoyances],
            ...otherFiltersByGroups[data.definedGroups.annoyances],
        ];

        const filtersByGroups: typeof this.filtersByGroups = {};
        data.filtersByGroups.forEach((filters, groupId) => {
            filtersByGroups[groupId] = filters.ids;
        });
        this.filtersByGroups = filtersByGroups;
    }

    // ------------------------------------------------------------------
    // Mutation methods (Settings-only)
    // ------------------------------------------------------------------

    /**
     * Setter for enabled filter IDs — optimistically updates local
     * state, preserving the previous state for rollback.
     * @param ids Filter IDs to add or remove.
     * @param isEnabled Whether to enable (`true`) or disable (`false`).
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
     * Switcher for the Safari Protection page — toggles filter state
     * and sends the update to the platform. Rolls back on error.
     * @param ids Filter IDs to toggle.
     * @param isEnabled Whether to enable or disable.
     */
    public async switchFiltersState(ids: number[], isEnabled: boolean) {
        const prevState = Array.from(this.enabledFilters);
        this.updateLocalEnabledFilters(ids, isEnabled);

        const data = new FiltersUpdate({ ids, isEnabled });
        const hasError = await window.API.Execute(new UpdateFiltersRequest(data));

        if (hasError.hasError) {
            this.setEnabledFilters(prevState);
            return hasError;
        }
    }

    /**
     * Updates custom filter info.
     * @param filterId Custom filter ID.
     * @param title New title.
     * @param isTrusted Whether the filter is trusted.
     */
    public async updateCustomFilter(filterId: number, title: string, isTrusted: boolean) {
        const error = await window.API.Execute(new UpdateCustomFilterRequest({
            filterId,
            title,
            isTrusted,
        }));

        if (error.hasError) {
            return error;
        }

        const filter = this.filtersMap.get(filterId);
        if (filter) {
            filter.title = title;
            filter.trusted = isTrusted;
            this.localUpdateFilter(filter);
        }

        this.fetchFilters();
    }

    /**
     * Prepares custom filters for deletion by marking them and
     * allowing undo or confirm delete.
     * @param filters The filters to prepare for deletion. If not
     *   provided, all custom filters will be used.
     * @returns An object with `undoDelete` and `confirmDelete` methods.
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
     * Add a custom filter.
     * @param url Subscription URL.
     * @param title Filter title.
     * @param isTrusted Whether the filter is trusted.
     */
    public async addCustomFilter(url: string, title: string, isTrusted: boolean) {
        const error = await window.API.Execute(new ConfirmAddCustomFilterRequest({
            url, title, trusted: isTrusted,
        }));
        if (error.hasError) {
            return error;
        }
        this.fetchFilters();
    }

    /**
     * Request info of enabled filters divided by extensions.
     */
    public async getFiltersGroupedByExtension() {
        const data = await window.API.Execute(new GetFiltersGroupedByExtensionsRequest());
        this.setFiltersGroupedByExtension(data);
    }

    /**
     * Setter for FiltersGroupedByExtensions.
     * @param data Grouped filters data from the platform.
     */
    public setFiltersGroupedByExtension(data: FiltersGroupedByExtensions) {
        this.filtersGroupedByExtension = data;
    }

    /**
     * Update language-specific filter value.
     * @param value Whether language-specific filters should be enabled.
     */
    public updateLanguageSpecific(value: boolean) {
        window.API.Execute(new UpdateLanguageSpecificRequest({ value }));
        this.languageSpecific = value;
    }

    /**
     * Setter for CustomFiltersSubscribeURL.
     * @param url Current value of custom filters subscribe URL.
     */
    public setCustomFiltersSubscribeURL(url: string) {
        this.customFiltersSubscribeURL = url;
    }
}
