// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import { FiltersIndex, FiltersDefinedGroups, FiltersIds } from '../../modules/common/apis/types/Filters';

import type { Filter } from '../../modules/common/apis/types';

// Minimal mock FiltersIndex for testing health-check computeds
function createFiltersIndex(overrides: Partial<FiltersIndex> = {}): FiltersIndex {
    const idx = new FiltersIndex();
    idx.definedGroups = new FiltersDefinedGroups({
        adBlocking: 1,
        privacy: 2,
        socialWidgets: 3,
        annoyances: 4,
        security: 5,
        other: 6,
        languageSpecific: 7,
        ...overrides.definedGroups,
    });
    idx.unblockSearchAdsFilterId = overrides.unblockSearchAdsFilterId ?? 999;
    idx.cookieNoticeFilterId = overrides.cookieNoticeFilterId ?? 100;
    idx.popUpsFilterId = overrides.popUpsFilterId ?? 101;
    idx.widgetsFilterId = overrides.widgetsFilterId ?? 102;
    idx.otherAnnoyanceFilterId = overrides.otherAnnoyanceFilterId ?? 103;

    // Build recommendedFiltersIdsByGroupDict
    const recGroups: Record<number, number[]> = {
        1: [1, 2, 3],
        2: [10, 11, 12],
        3: [20, 21],
        4: [30],
        5: [40],
        6: [50],
        7: [60],
        ...overrides.recommendedFiltersIdsByGroupDict,
    };
    const recMap = new Map<number, FiltersIds>();
    for (const [k, ids] of Object.entries(recGroups)) {
        recMap.set(Number(k), new FiltersIds({ ids }));
    }
    idx.recommendedFiltersIdsByGroupDict = recMap;

    return idx;
}

// Simplified Filters store (simulates the merged computeds)
class FiltersStore {
    public filtersIndex = createFiltersIndex();
    public enabledFilters = new Set<number>();
    public recommendedFiltersByGroups: Record<string, number[]> = {};
    public filters: { customFilters: Filter[] } = { customFilters: [] };
    public switchFiltersStateCalls: { ids: number[]; isEnabled: boolean }[] = [];

    constructor() {
        // Populate recommendedFiltersByGroups from the index
        const groups: Record<string, number[]> = {};
        this.filtersIndex.recommendedFiltersIdsByGroupDict.forEach((fIds, gid) => {
            groups[String(gid)] = fIds.ids;
        });
        this.recommendedFiltersByGroups = groups;
    }

    get blockAds(): boolean {
        const definedGroups = this.filtersIndex.definedGroups || {};
        return !!this.recommendedFiltersByGroups[definedGroups.adBlocking]?.every(
            (id) => this.enabledFilters.has(id),
        );
    }

    get blockSearchAds(): boolean {
        return !this.enabledFilters.has(this.filtersIndex.unblockSearchAdsFilterId);
    }

    get blockTrackers(): boolean {
        const definedGroups = this.filtersIndex.definedGroups || {};
        return !!this.recommendedFiltersByGroups[definedGroups.privacy]?.every(
            (id) => this.enabledFilters.has(id),
        );
    }

    get blockSocialButtons(): boolean {
        const definedGroups = this.filtersIndex.definedGroups || {};
        return !!this.recommendedFiltersByGroups[definedGroups.socialWidgets]?.every(
            (id) => this.enabledFilters.has(id),
        );
    }

    get blockCookieNotice(): boolean {
        return this.enabledFilters.has(this.filtersIndex.cookieNoticeFilterId);
    }

    get blockPopups(): boolean {
        return this.enabledFilters.has(this.filtersIndex.popUpsFilterId);
    }

    get blockWidgets(): boolean {
        return this.enabledFilters.has(this.filtersIndex.widgetsFilterId);
    }

    get blockOtherAnnoyance(): boolean {
        return this.enabledFilters.has(this.filtersIndex.otherAnnoyanceFilterId);
    }

    get enabledCustomFiltersCount(): number {
        return this.filters.customFilters.filter(({ enabled }) => enabled).length;
    }

    get languageSpecificEnabled(): boolean {
        const definedGroups = this.filtersIndex.definedGroups || {};
        return !!this.recommendedFiltersByGroups[definedGroups.languageSpecific]?.find(
            (id) => this.enabledFilters.has(id),
        );
    }
}

describe('Filters store (merged SafariProtection computeds)', () => {
    let store: FiltersStore;

    beforeEach(() => {
        store = new FiltersStore();
    });

    describe('blockAds', () => {
        it('returns true when all recommended ad blocking filters are enabled', () => {
            store.filtersIndex.recommendedFiltersIdsByGroupDict.get(1)!.ids.forEach((id) => {
                store.enabledFilters.add(id);
            });
            assert.equal(store.blockAds, true);
        });

        it('returns false when a recommended ad blocking filter is disabled', () => {
            store.enabledFilters.add(1); // only one of three
            assert.equal(store.blockAds, false);
        });

        it('returns false when no ad blocking filters are enabled', () => {
            assert.equal(store.blockAds, false);
        });
    });

    describe('blockSearchAds', () => {
        it('returns false when unblockSearchAds filter IS enabled', () => {
            store.enabledFilters.add(999);
            assert.equal(store.blockSearchAds, false);
        });

        it('returns true when unblockSearchAds filter is NOT enabled', () => {
            assert.equal(store.blockSearchAds, true);
        });
    });

    describe('blockTrackers', () => {
        it('returns true when all recommended privacy filters are enabled', () => {
            [10, 11, 12].forEach((id) => store.enabledFilters.add(id));
            assert.equal(store.blockTrackers, true);
        });

        it('returns false when a privacy filter is missing', () => {
            store.enabledFilters.add(10);
            assert.equal(store.blockTrackers, false);
        });
    });

    describe('blockSocialButtons', () => {
        it('returns true when all social widget filters are enabled', () => {
            [20, 21].forEach((id) => store.enabledFilters.add(id));
            assert.equal(store.blockSocialButtons, true);
        });
    });

    describe('blockCookieNotice', () => {
        it('returns true when cookie notice filter is enabled', () => {
            store.enabledFilters.add(100);
            assert.equal(store.blockCookieNotice, true);
        });

        it('returns false when cookie notice filter is not enabled', () => {
            assert.equal(store.blockCookieNotice, false);
        });
    });

    describe('blockPopups', () => {
        it('returns true when popups filter is enabled', () => {
            store.enabledFilters.add(101);
            assert.equal(store.blockPopups, true);
        });
    });

    describe('blockWidgets', () => {
        it('returns true when widgets filter is enabled', () => {
            store.enabledFilters.add(102);
            assert.equal(store.blockWidgets, true);
        });
    });

    describe('blockOtherAnnoyance', () => {
        it('returns true when other annoyance filter is enabled', () => {
            store.enabledFilters.add(103);
            assert.equal(store.blockOtherAnnoyance, true);
        });
    });

    describe('enabledCustomFiltersCount', () => {
        it('returns the count of enabled custom filters', () => {
            store.filters.customFilters = [
                { enabled: true } as Filter,
                { enabled: false } as Filter,
                { enabled: true } as Filter,
            ];
            assert.equal(store.enabledCustomFiltersCount, 2);
        });

        it('returns 0 when no custom filters are enabled', () => {
            store.filters.customFilters = [{ enabled: false } as Filter];
            assert.equal(store.enabledCustomFiltersCount, 0);
        });
    });

    describe('languageSpecificEnabled', () => {
        it('returns true when any language-specific filter is enabled', () => {
            store.enabledFilters.add(60);
            assert.equal(store.languageSpecificEnabled, true);
        });

        it('returns false when no language-specific filters are enabled', () => {
            assert.equal(store.languageSpecificEnabled, false);
        });
    });
});
