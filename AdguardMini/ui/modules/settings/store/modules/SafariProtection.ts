// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later
import { makeObservable, computed, action } from 'mobx';

import { SafariProtectionData } from 'Common/stores/SafariProtectionData';

import type { Filters } from './Filters';

/**
 * Settings-only Safari Protection store.
 *
 * Extends the shared read-only {@link SafariProtectionData} with
 * Settings-only mutation methods (`updateBlockAds`,
 * `updateBlockSearchAds`, `updateBlockTrackers`, etc.) that toggle
 * filter state on the platform via the full {@link Filters} store's
 * `switchFiltersState` method.
 */
export class SafariProtection extends SafariProtectionData {
    /**
     * The full Filters store (cast from `SafariProtectionData.filters`
     * for mutation-method access to `switchFiltersState`). Safe because
     * `SafariProtection` is only constructed by `SettingsStore`, which
     * always passes a full `Filters` instance.
     */
    public get filtersStore(): Filters {
        return this.filters as Filters;
    }

    /**
     * Ctor
     *
     * @param filters Full Filters store instance (extends `FiltersData`).
     */
    public constructor(filters: Filters) {
        super(filters);
        makeObservable(this, {
            filtersStore: computed,
            updateBlockAds: action,
            updateBlockSearchAds: action,
            updateBlockTrackers: action,
            updateBlockSocialButtons: action,
            updateBlockCookieNotice: action,
            updateBlockPopups: action,
            updateBlockWidgets: action,
            updateBlockOther: action,
        });
    }

    /**
     * Update blockAds in safari protection.
     *
     * @param value Whether ad-blocking should be enabled.
     */
    public async updateBlockAds(value: boolean) {
        const { recommendedFiltersByGroups, filtersIndex } = this.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return this.filtersStore.switchFiltersState(
            recommendedFiltersByGroups[definedGroups.adBlocking],
            value,
        );
    }

    /**
     * Update blockSearchAds in safari protection.
     *
     * @param value Whether search-ad blocking should be enabled.
     */
    public async updateBlockSearchAds(value: boolean) {
        const { filtersIndex } = this.filters;
        return this.filtersStore.switchFiltersState(
            [filtersIndex.unblockSearchAdsFilterId],
            !value,
        );
    }

    /**
     * Update blockTrackers in safari protection.
     *
     * @param value Whether tracker blocking should be enabled.
     */
    public async updateBlockTrackers(value: boolean) {
        const { recommendedFiltersByGroups, filtersIndex } = this.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return this.filtersStore.switchFiltersState(
            recommendedFiltersByGroups[definedGroups.privacy],
            value,
        );
    }

    /**
     * Update blockSocialButtons in safari protection.
     *
     * @param value Whether social-widget blocking should be enabled.
     */
    public async updateBlockSocialButtons(value: boolean) {
        const { recommendedFiltersByGroups, filtersIndex } = this.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return this.filtersStore.switchFiltersState(
            recommendedFiltersByGroups[definedGroups.socialWidgets],
            value,
        );
    }

    /**
     * Update blockCookieNotice in safari protection.
     *
     * @param value Whether cookie-notice blocking should be enabled.
     */
    public async updateBlockCookieNotice(value: boolean) {
        const { filtersIndex } = this.filters;
        return this.filtersStore.switchFiltersState(
            [filtersIndex.cookieNoticeFilterId],
            value,
        );
    }

    /**
     * Update blockPopups in safari protection.
     *
     * @param value Whether popup blocking should be enabled.
     */
    public async updateBlockPopups(value: boolean) {
        const { filtersIndex } = this.filters;
        return this.filtersStore.switchFiltersState(
            [filtersIndex.popUpsFilterId],
            value,
        );
    }

    /**
     * Update blockWidgets in safari protection.
     *
     * @param value Whether widget blocking should be enabled.
     */
    public async updateBlockWidgets(value: boolean) {
        const { filtersIndex } = this.filters;
        return this.filtersStore.switchFiltersState(
            [filtersIndex.widgetsFilterId],
            value,
        );
    }

    /**
     * Update blockOther in safari protection.
     *
     * @param value Whether other-annoyance blocking should be enabled.
     */
    public async updateBlockOther(value: boolean) {
        const { filtersIndex } = this.filters;
        return this.filtersStore.switchFiltersState(
            [filtersIndex.otherAnnoyanceFilterId],
            value,
        );
    }
}
