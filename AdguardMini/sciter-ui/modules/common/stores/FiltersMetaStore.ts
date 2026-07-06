// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FiltersMetaStore.ts
//  AdguardMini
//

import { makeAutoObservable, observable, runInAction } from 'mobx';

import { GetEnabledFiltersIdsRequest, GetFiltersGroupedByExtensionsRequest, GetFiltersIndexRequest, GetFiltersMetadataRequest, UpdateLanguageSpecificRequest, UpdateFiltersRequest } from 'Apis/requests/FiltersService';
import {
    FiltersGroupedByExtensions,
    Filters as FiltersEnt,
    FiltersIndex,
    FiltersUpdate,
} from 'Apis/types';

import type { Filter } from 'Apis/types';

/**
 * Shared store for filter metadata and index.
 * Used by settings FilterLists, SafariProtection, CustomFilters and tray TrayFilters.
 */
export class FiltersMetaStore {
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

    /**
     * Ctor — self-initializes by fetching filter data
     */
    constructor() {
        makeAutoObservable(this, undefined, { autoBind: true });
    }

    /**
     * Get filters metadata from Swift
     */
    public async getFilters(): Promise<void> {
        try {
            const resp = await window.API.Execute(new GetFiltersMetadataRequest());
            runInAction(() => {
                this.setFilters(resp);
            });
        } catch (err) {
            log.error('FiltersMetaStore.getFilters failed', String(err));
        }
    }

    /**
     * Get enabled filters ids
     */
    public async getEnabledFilters(): Promise<void> {
        try {
            const resp = await window.API.Execute(new GetEnabledFiltersIdsRequest());
            runInAction(() => {
                this.setEnabledFilters(resp.ids);
            });
        } catch (err) {
            log.error('FiltersMetaStore.getEnabledFilters failed', String(err));
        }
    }

    /**
     * Get filters index from Swift
     */
    public async getFiltersIndex(): Promise<void> {
        try {
            const index = await window.API.Execute(new GetFiltersIndexRequest());
            runInAction(() => {
                this.setIndex(index);
            });
        } catch (err) {
            log.error('FiltersMetaStore.getFiltersIndex failed', String(err));
        }
    }

    /**
     * Get filters grouped by extension
     */
    public async getFiltersGroupedByExtension(): Promise<void> {
        try {
            const data = await window.API.Execute(new GetFiltersGroupedByExtensionsRequest());
            runInAction(() => {
                this.setFiltersGroupedByExtension(data);
            });
        } catch (err) {
            log.error('FiltersMetaStore.getFiltersGroupedByExtension failed', String(err));
        }
    }

    /**
     * Setter for enabled filters ids
     */
    public setEnabledFilters(ids: number[]): void {
        this.enabledFilters = new Set(ids);
    }

    /**
     * Update local enabled filters optimistically
     */
    public updateLocalEnabledFilters(ids: number[], isEnabled: boolean): void {
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
     * Switcher for filter states with optimistic update and rollback
     * @returns true if error happened, false otherwise
     */
    public async switchFiltersState(ids: number[], isEnabled: boolean): Promise<boolean> {
        try {
            const prevState = Array.from(this.enabledFilters);
            this.updateLocalEnabledFilters(ids, isEnabled);

            const data = new FiltersUpdate({ ids, isEnabled });
            const hasError = await window.API.Execute(new UpdateFiltersRequest(data));

            if (hasError.hasError) {
                runInAction(() => {
                    this.setEnabledFilters(prevState);
                });
                return true;
            }
        } catch (err) {
            log.error('FiltersMetaStore.switchFiltersState failed', String(err));
            return true;
        }
        return false;
    }

    /**
     * Setter for filters index with group mapping
     */
    public setIndex(data: FiltersIndex): void {
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
     * Setter for filters metadata
     */
    public setFilters(filters: FiltersEnt): void {
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
     * Setter for FiltersGroupedByExtensions
     */
    public setFiltersGroupedByExtension(data: FiltersGroupedByExtensions): void {
        this.filtersGroupedByExtension = data;
    }

    /**
     * Update language specific value
     */
    public updateLanguageSpecific(value: boolean): void {
        window.API.Execute(new UpdateLanguageSpecificRequest({ value }));
        this.languageSpecific = value;
    }
}
