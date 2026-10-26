// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import {
    makeObservable,
    observable,
    action,
    computed,
} from 'mobx';

import {
    GetEnabledFiltersIdsRequest,
    GetFiltersIndexRequest,
    GetFiltersMetadataRequest,
} from 'Apis/requests/FiltersService';
import {
    Filters as FiltersEnt,
    FiltersIndex,
} from 'Apis/types';

import type { Filter } from 'Apis/types';

/**
 * Minimal shared read-only Filters data store.
 *
 * Holds only the filter metadata and enabled-filter data that the shared
 * {@link SafariProtectionData} computed getters depend on, plus the fetch
 * methods to populate that data from the platform layer. Has no mutation
 * methods (`switchFiltersState`, `updateCustomFilter`, `addCustomFilter`,
 * etc.) — those live in the Settings-only {@link Filters} class that
 * extends this store.
 *
 * Used by the Tray module (which only needs read access to filter data
 * for the health-check stories) and as the base class for the Settings
 * module's full `Filters` store.
 */
export class FiltersData {
    /**
     * Set of enabled filter IDs, sourced from `GetEnabledFiltersIdsRequest`.
     */
    public enabledFilters = new Set<number>();

    /**
     * Whether the enabled filter IDs have been received from the platform.
     */
    public enabledFiltersLoaded = false;

    /**
     * Whether the filters index has been received from the platform.
     */
    public filtersIndexLoaded = false;

    /**
     * Map of filter ID → Filter metadata, populated by `setFilters`.
     */
    public filtersMap = observable.map<number, Filter>(
        new Map<number, Filter>(),
        { deep: false },
    );

    /**
     * Filters index (group definitions, recommended-filter-to-group
     * mappings, per-category filter IDs).
     */
    public filtersIndex = new FiltersIndex();

    /**
     * Recommended filter IDs keyed by group ID string.
     */
    public recommendedFiltersByGroups: Record<string, number[]> = {};

    /**
     * Full filters metadata (regular and custom filters).
     */
    public filters = new FiltersEnt();

    /**
     * Whether the data the Safari Protection health check derives its filter
     * warnings from has been loaded.
     */
    public get isLoaded(): boolean {
        return this.enabledFiltersLoaded && this.filtersIndexLoaded;
    }

    /**
     * Ctor
     */
    public constructor() {
        makeObservable(this, {
            enabledFilters: observable,
            enabledFiltersLoaded: observable,
            filtersIndexLoaded: observable,
            filtersMap: observable,
            filtersIndex: observable,
            recommendedFiltersByGroups: observable,
            filters: observable,
            isLoaded: computed,
            getFilters: action,
            getEnabledFilters: action,
            getFiltersIndex: action,
            fetchFilters: action,
            setEnabledFilters: action,
            setFilters: action,
            setIndex: action,
        });
    }

    /**
     * Get filters metadata from the platform layer.
     */
    public async getFilters() {
        const resp = await window.API.Execute(new GetFiltersMetadataRequest());
        this.setFilters(resp);
    }

    /**
     * Get enabled filter IDs from the platform layer.
     */
    public async getEnabledFilters() {
        const resp = await window.API.Execute(new GetEnabledFiltersIdsRequest());
        this.setEnabledFilters(resp.ids);
    }

    /**
     * Get filters index from the platform layer.
     */
    public async getFiltersIndex() {
        const index = await window.API.Execute(new GetFiltersIndexRequest());
        this.setIndex(index);
    }

    /**
     * Convenience: fetch both enabled filters and full filters metadata.
     */
    public fetchFilters() {
        this.getEnabledFilters();
        this.getFilters();
    }

    /**
     * Setter for enabled filter IDs.
     * @param ids Enabled filter IDs from the platform.
     */
    public setEnabledFilters(ids: number[]) {
        this.enabledFilters = new Set(ids);
        this.enabledFiltersLoaded = true;
    }

    /**
     * Setter for full filters metadata.
     * @param filtersEnt Full filters metadata from the platform.
     */
    public setFilters(filtersEnt: FiltersEnt) {
        this.filters = filtersEnt;
        filtersEnt.filters.forEach((f) => {
            this.filtersMap.set(f.id, f);
        });
        filtersEnt.customFilters.forEach((f) => {
            this.filtersMap.set(f.id, f);
        });
    }

    /**
     * Setter for the filters index.
     * @param data Filters index from the platform.
     */
    public setIndex(data: FiltersIndex) {
        this.filtersIndex = data;
        const recommendedFiltersByGroup: typeof this.recommendedFiltersByGroups = {};
        data.recommendedFiltersIdsByGroupDict.forEach((filters, groupId) => {
            recommendedFiltersByGroup[groupId] = filters.ids;
        });
        this.recommendedFiltersByGroups = recommendedFiltersByGroup;
        this.filtersIndexLoaded = true;
    }
}
