// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariProtection.ts
//  AdguardMini
//

import { makeAutoObservable } from 'mobx';

import type { FiltersMetaStore } from 'Common/stores/FiltersMetaStore';

/**
 * Safari Protection health-check computed properties and update actions.
 * Extracted from the merged Filters/SafariProtection store.
 */
export class SafariProtection {
    // This should be private but due to MobX typings we make it public or we have error in makeAutoObservable
    public readonly filtersMeta: FiltersMetaStore;

    // ---- Health-check computed properties ----

    /**
     * Value for block ads
     */
    public get blockAds(): boolean {
        const definedGroups = this.filtersMeta.filtersIndex.definedGroups || {};
        return !!this.filtersMeta.recommendedFiltersByGroups[definedGroups.adBlocking]?.every(
            (id) => this.filtersMeta.enabledFilters.has(id),
        );
    }

    /**
     * Value for search ads
     */
    public get blockSearchAds(): boolean {
        return !this.filtersMeta.enabledFilters.has(this.filtersMeta.filtersIndex.unblockSearchAdsFilterId);
    }

    /**
     * Value for language specific
     */
    public get languageSpecificEnabled(): boolean {
        const definedGroups = this.filtersMeta.filtersIndex.definedGroups || {};
        return !!this.filtersMeta.recommendedFiltersByGroups[definedGroups.languageSpecific]?.find(
            (id) => this.filtersMeta.enabledFilters.has(id),
        );
    }

    /**
     * Value for block trackers
     */
    public get blockTrackers(): boolean {
        const definedGroups = this.filtersMeta.filtersIndex.definedGroups || {};
        return !!this.filtersMeta.recommendedFiltersByGroups[definedGroups.privacy]?.every(
            (id) => this.filtersMeta.enabledFilters.has(id),
        );
    }

    /**
     * Value for block social buttons
     */
    public get blockSocialButtons(): boolean {
        const definedGroups = this.filtersMeta.filtersIndex.definedGroups || {};
        return !!this.filtersMeta.recommendedFiltersByGroups[definedGroups.socialWidgets]?.every(
            (id) => this.filtersMeta.enabledFilters.has(id),
        );
    }

    /**
     * Value for block cookie notice
     */
    public get blockCookieNotice(): boolean {
        return this.filtersMeta.enabledFilters.has(this.filtersMeta.filtersIndex.cookieNoticeFilterId);
    }

    /**
     * Value for block pop ups
     */
    public get blockPopups(): boolean {
        return this.filtersMeta.enabledFilters.has(this.filtersMeta.filtersIndex.popUpsFilterId);
    }

    /**
     * Value for block widgets
     */
    public get blockWidgets(): boolean {
        return this.filtersMeta.enabledFilters.has(this.filtersMeta.filtersIndex.widgetsFilterId);
    }

    /**
     * Value for block other annoyance
     */
    public get blockOtherAnnoyance(): boolean {
        return this.filtersMeta.enabledFilters.has(this.filtersMeta.filtersIndex.otherAnnoyanceFilterId);
    }

    /**
     * Enabled custom filters count
     */
    public get enabledCustomFiltersCount(): number {
        const enabledCustomFilters = this.filtersMeta.filters.customFilters.filter(({ enabled }) => enabled);
        return enabledCustomFilters.length;
    }

    /**
     * Ctor
     *
     * @param filtersMeta Filters metadata store for health-check data
     */
    constructor(filtersMeta: FiltersMetaStore) {
        this.filtersMeta = filtersMeta;
        makeAutoObservable(this, {
            filtersMeta: false,
        }, { autoBind: true });
    }

    // ---- SafariProtection update actions ----

    /**
     * Update blockAds in safari protection
     */
    public async updateBlockAds(value: boolean) {
        const definedGroups = this.filtersMeta.filtersIndex.definedGroups || {};
        return this.filtersMeta.switchFiltersState(
            this.filtersMeta.recommendedFiltersByGroups[definedGroups.adBlocking],
            value,
        );
    }

    /**
     * Update blockSearchAds in safari protection
     */
    public async updateBlockSearchAds(value: boolean) {
        return this.filtersMeta.switchFiltersState(
            [this.filtersMeta.filtersIndex.unblockSearchAdsFilterId],
            !value,
        );
    }

    /**
     * Update blockTrackers in safari protection
     */
    public async updateBlockTrackers(value: boolean) {
        const definedGroups = this.filtersMeta.filtersIndex.definedGroups || {};
        return this.filtersMeta.switchFiltersState(
            this.filtersMeta.recommendedFiltersByGroups[definedGroups.privacy],
            value,
        );
    }

    /**
     * Update blockSocialButtons in safari protection
     */
    public async updateBlockSocialButtons(value: boolean) {
        const definedGroups = this.filtersMeta.filtersIndex.definedGroups || {};
        return this.filtersMeta.switchFiltersState(
            this.filtersMeta.recommendedFiltersByGroups[definedGroups.socialWidgets],
            value,
        );
    }

    /**
     * Update blockCookieNotice in safari protection
     */
    public async updateBlockCookieNotice(value: boolean) {
        return this.filtersMeta.switchFiltersState(
            [this.filtersMeta.filtersIndex.cookieNoticeFilterId],
            value,
        );
    }

    /**
     * Update blockPopups in safari protection
     */
    public async updateBlockPopups(value: boolean) {
        return this.filtersMeta.switchFiltersState(
            [this.filtersMeta.filtersIndex.popUpsFilterId],
            value,
        );
    }

    /**
     * Update blockWidgets in safari protection
     */
    public async updateBlockWidgets(value: boolean) {
        return this.filtersMeta.switchFiltersState(
            [this.filtersMeta.filtersIndex.widgetsFilterId],
            value,
        );
    }

    /**
     * Update blockOther in safari protection
     */
    public async updateBlockOther(value: boolean) {
        return this.filtersMeta.switchFiltersState(
            [this.filtersMeta.filtersIndex.otherAnnoyanceFilterId],
            value,
        );
    }

    /**
     * Resets safari protection
     */
    public resetSafariProtection(): void {
        // TODO: AG-XXXX
    }
}
