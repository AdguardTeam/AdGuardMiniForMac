// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeObservable, observable, action } from 'mobx';

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
     * Ctor
     */
    public constructor() {
        makeObservable(this, {
            enabledFilters: observable,
            filtersMap: observable,
            filtersIndex: observable,
            recommendedFiltersByGroups: observable,
            filters: observable,
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
    }
}
