// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TrayFilters.ts
//  AdguardMini
//

import { makeAutoObservable } from 'mobx';

import { RequestFiltersUpdateRequest } from 'Apis/requests/FiltersService';

import type { Filter, FiltersStatus } from 'Apis/types';
import type { FiltersMetaStore } from 'Common/stores/FiltersMetaStore';

const FILTERS_UPDATE_INTERVAL = 5 * 60 * 1000;

/**
 * Tray filters update checking and status.
 */
export class TrayFilters {
    /**
     * Debouncer for update checking
     */
    private lastTimeUpdate: number | undefined;

    // This should be private but due to MobX typings we make it public or we have error in makeAutoObservable
    public readonly filtersMeta: FiltersMetaStore;

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
     * Ctor
     *
     * @param filtersMeta Shared filter metadata store
     */
    constructor(filtersMeta: FiltersMetaStore) {
        this.filtersMeta = filtersMeta;
        makeAutoObservable(this, {
            filtersMeta: false,
        }, { autoBind: true });
    }

    /**
     * Set filters from meta store for tray display
     */
    private setFiltersFromMeta(): void {
        this.filtersMap = [...this.filtersMeta.filters.filters, ...this.filtersMeta.filters.customFilters];
    }

    /**
     * Start the process of checking filters updates
     */
    public checkFiltersUpdate(): void {
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
     * Force retry filters update
     */
    public tryAgainFiltersUpdate(): void {
        window.API.Execute(new RequestFiltersUpdateRequest());
        this.filtersUpdateResult = null;
        this.filtersUpdating = true;
    }

    /**
     * Filters data for updates
     */
    public async getFiltersMetadata(): Promise<void> {
        await this.filtersMeta.getFilters();
        this.setFiltersFromMeta();
    }

    /**
     * Set filters status
     */
    public setFiltersStatus(result: FiltersStatus): void {
        this.filtersUpdating = false;
        this.filtersUpdateResult = result;
    }
}
