// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { makeObservable, computed } from 'mobx';

import type { FiltersData } from './FiltersData';

/**
 * Shared read-only Safari Protection data.
 *
 * Derives Safari-protection health-check booleans from a `FiltersData`
 * store. Has NO mutation methods — those live in the Settings-only
 * {@link SafariProtection} class that extends this class. Receives its
 * dependencies as explicit constructor parameters (no parent-store
 * reference).
 *
 * Used by the Tray module (which only needs the computed getters for
 * the health-check stories) and as the base class for the Settings
 * module's `SafariProtection` store.
 */
export class SafariProtectionData {
    /** Shared Filters data store (read-only contract). */
    public readonly filters: FiltersData;

    /**
     * Get all enabled filter IDs as an array.
     */
    public get enabledFilters() {
        return Array.from(this.filters.enabledFilters);
    }

    /**
     * Whether all recommended ad-blocking filters are enabled.
     */
    public get blockAds() {
        const { recommendedFiltersByGroups, filtersIndex } = this.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return !!recommendedFiltersByGroups[definedGroups.adBlocking]?.every(
            (id) => this.enabledFilters.includes(id),
        );
    }

    /**
     * Whether the unblock-search-ads filter is NOT enabled
     * (i.e., search ads ARE blocked).
     */
    public get blockSearchAds() {
        const { filtersIndex } = this.filters;
        return !this.enabledFilters.includes(filtersIndex.unblockSearchAdsFilterId);
    }

    /**
     * Whether any recommended language-specific filter is enabled.
     */
    public get languageSpecific() {
        const { recommendedFiltersByGroups, filtersIndex } = this.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return !!recommendedFiltersByGroups[definedGroups.languageSpecific]?.find(
            (id) => this.enabledFilters.includes(id),
        );
    }

    /**
     * Whether all recommended privacy (tracker-blocking) filters are enabled.
     */
    public get blockTrackers() {
        const { recommendedFiltersByGroups, filtersIndex } = this.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return !!recommendedFiltersByGroups[definedGroups.privacy]?.every(
            (id) => this.enabledFilters.includes(id),
        );
    }

    /**
     * Whether all recommended social-widgets filters are enabled.
     */
    public get blockSocialButtons() {
        const { recommendedFiltersByGroups, filtersIndex } = this.filters;
        const definedGroups = filtersIndex.definedGroups || {};
        return !!recommendedFiltersByGroups[definedGroups.socialWidgets]?.every(
            (id) => this.enabledFilters.includes(id),
        );
    }

    /**
     * Whether the cookie-notice annoyance filter is enabled.
     */
    public get blockCookieNotice() {
        const { filtersIndex } = this.filters;
        return this.enabledFilters.includes(filtersIndex.cookieNoticeFilterId);
    }

    /**
     * Whether the popups annoyance filter is enabled.
     */
    public get blockPopups() {
        const { filtersIndex } = this.filters;
        return this.enabledFilters.includes(filtersIndex.popUpsFilterId);
    }

    /**
     * Whether the widgets annoyance filter is enabled.
     */
    public get blockWidgets() {
        const { filtersIndex } = this.filters;
        return this.enabledFilters.includes(filtersIndex.widgetsFilterId);
    }

    /**
     * Whether the other-annoyance filter is enabled.
     */
    public get blockOtherAnnoyance() {
        const { filtersIndex } = this.filters;
        return this.enabledFilters.includes(filtersIndex.otherAnnoyanceFilterId);
    }

    /**
     * Count of enabled custom filters.
     */
    public get enabledCustomFiltersCount() {
        const { filters: { customFilters } } = this.filters;
        const enabledCustomFilters = customFilters.filter(({ enabled }) => enabled);
        return enabledCustomFilters.length;
    }

    /**
     * Ctor
     *
     * @param filters Shared Filters data store instance.
     */
    public constructor(filters: FiltersData) {
        this.filters = filters;
        makeObservable(this, {
            filters: true,
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
            enabledCustomFiltersCount: computed,
        }, { autoBind: true });
    }
}
