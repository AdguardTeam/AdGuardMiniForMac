// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeAutoObservable, computed } from 'mobx';

import type { SettingsStore } from 'SettingsStore';

/**
 * SafariProtection store. Because settings in safari protection page depends on enable/disabled filters
 * all platform data received from Filters store, and action update also filter.
 * This store is excusably use enabled filters ids and filtersMap, that split filters to groups.
 */
export class SafariProtection {
    public rootStore: SettingsStore;

    /**
     * Get all enabled filters Ids
     */
    public get enabledFilters() {
        return Array.from(this.rootStore.filters.enabledFilters);
    }

    /**
     * Value for block ads
     */
    public get blockAds() {
        const { recommendedFiltersByGroups, filtersIndex } = this.rootStore.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return !!recommendedFiltersByGroups[definedGroups.adBlocking]?.every(
            (id) => this.enabledFilters.includes(id),
        );
    }

    /**
     * Value for search ads
     */
    public get blockSearchAds() {
        const { filtersIndex } = this.rootStore.filters;
        return !this.enabledFilters.includes(filtersIndex.unblockSearchAdsFilterId);
    }

    /**
     * Value for language specific
     */
    public get languageSpecific() {
        const { recommendedFiltersByGroups, filtersIndex } = this.rootStore.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return !!recommendedFiltersByGroups[definedGroups.languageSpecific]?.find(
            (id) => this.enabledFilters.includes(id),
        );
    }

    /**
     * Value for block trackers
     */
    public get blockTrackers() {
        const { recommendedFiltersByGroups, filtersIndex } = this.rootStore.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return !!recommendedFiltersByGroups[definedGroups.privacy]?.every(
            (id) => this.enabledFilters.includes(id),
        );
    }

    /**
     * Value for block social buttons
     */
    public get blockSocialButtons() {
        const { recommendedFiltersByGroups, filtersIndex } = this.rootStore.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return !!recommendedFiltersByGroups[definedGroups.socialWidgets]?.every(
            (id) => this.enabledFilters.includes(id),
        );
    }

    /**
     * Value for block cookie notice
     */
    public get blockCookieNotice() {
        const { filtersIndex } = this.rootStore.filters;
        return this.enabledFilters.includes(filtersIndex.cookieNoticeFilterId);
    }

    /**
     * Value for block pop ups
     */
    public get blockPopups() {
        const { filtersIndex } = this.rootStore.filters;
        return this.enabledFilters.includes(filtersIndex.popUpsFilterId);
    }

    /**
     * Value for block widgets
     */
    public get blockWidgets() {
        const { filtersIndex } = this.rootStore.filters;
        return this.enabledFilters.includes(filtersIndex.widgetsFilterId);
    }

    /**
     * Value for block other annoyance
     */
    public get blockOtherAnnoyance() {
        const { filtersIndex } = this.rootStore.filters;
        return this.enabledFilters.includes(filtersIndex.otherAnnoyanceFilterId);
    }

    /**
     * Enabled custom filters count
     */
    public get enabledCustomFiltersCount() {
        const { filters: { customFilters } } = this.rootStore.filters;
        const enabledCustomFilters = customFilters.filter(({ enabled }) => enabled);
        return enabledCustomFilters.length;
    }

    /**
     * Ctor
     *
     * @param rootStore
     */
    public constructor(rootStore: SettingsStore) {
        this.rootStore = rootStore;
        makeAutoObservable(this, {
            rootStore: false,
            enabledFilters: computed,
            blockAds: computed,
            blockSearchAds: computed,
            languageSpecific: computed,
            blockTrackers: computed,
            blockSocialButtons: computed,
            blockCookieNotice: computed,
            blockPopups: computed,
            blockWidgets: computed,
            blockOtherAnnoyance: computed,
        }, { autoBind: true });
    }

    /**
     * Update blockAds in safari protection
     */
    public async updateBlockAds(value: boolean) {
        const { recommendedFiltersByGroups, filtersIndex } = this.rootStore.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return this.rootStore.filters.switchFiltersState(
            recommendedFiltersByGroups[definedGroups.adBlocking],
            value,
        );
    }

    /**
     * Update blockSearchAds in safari protection
     */
    public async updateBlockSearchAds(value: boolean) {
        const { filtersIndex } = this.rootStore.filters;
        return this.rootStore.filters.switchFiltersState(
            [filtersIndex.unblockSearchAdsFilterId],
            !value,
        );
    }

    /**
     * Update blockTrackers in safari protection
     */
    public async updateBlockTrackers(value: boolean) {
        const { recommendedFiltersByGroups, filtersIndex } = this.rootStore.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return this.rootStore.filters.switchFiltersState(
            recommendedFiltersByGroups[definedGroups.privacy],
            value,
        );
    }

    /**
     * Update blockSocialButtons in safari protection
     */
    public async updateBlockSocialButtons(value: boolean) {
        const { recommendedFiltersByGroups, filtersIndex } = this.rootStore.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return this.rootStore.filters.switchFiltersState(
            recommendedFiltersByGroups[definedGroups.socialWidgets],
            value,
        );
    }

    /**
     * Update blockCookieNotice in safari protection
     */
    public async updateBlockCookieNotice(value: boolean) {
        const { filtersIndex } = this.rootStore.filters;
        return this.rootStore.filters.switchFiltersState(
            [filtersIndex.cookieNoticeFilterId],
            value,
        );
    }

    /**
     * Update blockPopups in safari protection
     */
    public async updateBlockPopups(value: boolean) {
        const { filtersIndex } = this.rootStore.filters;
        return this.rootStore.filters.switchFiltersState(
            [filtersIndex.popUpsFilterId],
            value,
        );
    }

    /**
     * Update blockWidgets in safari protection
     */
    public async updateBlockWidgets(value: boolean) {
        const { filtersIndex } = this.rootStore.filters;
        return this.rootStore.filters.switchFiltersState(
            [filtersIndex.widgetsFilterId],
            value,
        );
    }

    /**
     * Resets safari protection
     */
    public resetSafariProtection() {
        // todo: add to swift
    }

    /**
     * Update blockOther in safari protection
     */
    public async updateBlockOther(value: boolean) {
        const { filtersIndex } = this.rootStore.filters;
        return this.rootStore.filters.switchFiltersState(
            [filtersIndex.otherAnnoyanceFilterId],
            value,
        );
    }
}
