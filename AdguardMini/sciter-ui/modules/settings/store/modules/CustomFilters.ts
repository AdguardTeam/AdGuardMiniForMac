// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  CustomFilters.ts
//  AdguardMini
//

import { makeAutoObservable, runInAction } from 'mobx';

import { ConfirmAddCustomFilterRequest, DeleteCustomFiltersRequest, UpdateCustomFilterRequest } from 'Apis/requests/FiltersService';
import { Filters as FiltersEnt } from 'Apis/types';

import type { SafariProtection } from './SafariProtection';
import type { Filter } from 'Apis/types';
import type { FiltersMetaStore } from 'Common/stores/FiltersMetaStore';

/**
 * Custom filter lifecycle management — add, update, delete with undo.
 */
export class CustomFilters {
    // This should be private but due to MobX typings we make it public or we have error in makeAutoObservable
    public readonly filtersMarkedForDeletion: Map<Filter['id'], Filter> = new Map();

    // This should be private but due to MobX typings we make it public or we have error in makeAutoObservable
    public readonly filtersMeta: FiltersMetaStore;

    // This should be private but due to MobX typings we make it public or we have error in makeAutoObservable
    public readonly safariProtection: SafariProtection;

    /**
     * Subscribe URL for custom filter flow
     */
    public customFiltersSubscribeURL: string = '';

    /**
     * Ctor
     *
     * @param filtersMeta Shared filter metadata store
     * @param safariProtection Safari protection health-check store
     */
    constructor(filtersMeta: FiltersMetaStore, safariProtection: SafariProtection) {
        this.filtersMeta = filtersMeta;
        this.safariProtection = safariProtection;
        makeAutoObservable(this, {
            filtersMeta: false,
            safariProtection: false,
            filtersMarkedForDeletion: false,
        }, { autoBind: true });
    }

    /**
     * Delete custom filters via Swift
     */
    private async deleteCustomFilters(filtersIds: Filter['id'][]): Promise<{ hasError?: boolean } | undefined> {
        const error = await window.API.Execute(new DeleteCustomFiltersRequest({ filtersIds }));
        if (error.hasError) {
            return error;
        }
        this.filtersMeta.getFilters();
    }

    /**
     * Updates custom filter info
     */
    public async updateCustomFilter(
        filterId: number, title: string, isTrusted: boolean,
    ): Promise<{ hasError?: boolean } | undefined> {
        try {
            const error = await window.API.Execute(new UpdateCustomFilterRequest({
                filterId, title, isTrusted,
            }));
            if (error.hasError) {
                return error;
            }
            const filter = this.filtersMeta.filtersMap.get(filterId);
            if (filter) {
                filter.title = title;
                filter.trusted = isTrusted;
                this.filtersMeta.filtersMap.set(filterId, filter);
            }
            this.filtersMeta.getFilters();
        } catch (err) {
            log.error('CustomFilters.updateCustomFilter failed', String(err));
        }
    }

    /**
     * Prepares custom filters for deletion by marking them and allowing undo or confirm.
     */
    public prepareCustomFiltersForDeletion(filters?: Filter[]): {
        undoDelete(): void;
        confirmDelete(): Promise<{ hasError?: boolean } | undefined>;
    } {
        let undoDeleteActionInvoked = false;
        const filtersToDelete = filters ?? this.filtersMeta.filters.customFilters;
        const filtersIds = filtersToDelete.map((filter) => filter.id);

        runInAction(() => {
            filtersToDelete.forEach((filter) => {
                this.filtersMarkedForDeletion.set(filter.id, filter);
            });
        });

        this.filtersMeta.setFilters(new FiltersEnt(this.filtersMeta.filters));

        return {
            undoDelete: () => {
                undoDeleteActionInvoked = true;
                const restoredFilters = new FiltersEnt(this.filtersMeta.filters);
                runInAction(() => {
                    filtersToDelete.forEach((filter) => {
                        const filterMarkedForDeletion = this.filtersMarkedForDeletion.get(filter.id);
                        if (filterMarkedForDeletion) {
                            restoredFilters.customFilters.unshift(filterMarkedForDeletion);
                            this.filtersMarkedForDeletion.delete(filter.id);
                        }
                    });
                });
                this.filtersMeta.setFilters(restoredFilters);
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
    public async addCustomFilter(
        url: string, title: string, isTrusted: boolean,
    ): Promise<{ hasError?: boolean } | undefined> {
        try {
            const error = await window.API.Execute(new ConfirmAddCustomFilterRequest({
                url, title, trusted: isTrusted,
            }));
            if (error.hasError) {
                return error;
            }
            this.filtersMeta.getFilters();
        } catch (err) {
            log.error('CustomFilters.addCustomFilter failed', String(err));
        }
    }

    /**
     * Setter for CustomFiltersSubscribeURL
     */
    public setCustomFiltersSubscribeURL(url: string): void {
        this.customFiltersSubscribeURL = url;
    }
}
