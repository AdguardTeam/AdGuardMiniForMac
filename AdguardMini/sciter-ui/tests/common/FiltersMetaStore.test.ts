// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  FiltersMetaStore.test.ts
//  AdguardMini
//

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

// Mock Sciter/webpack globals for Node.js test environment.
(globalThis as Record<string, unknown>).window ??= {
    API: {
        Execute: async () => new Proxy({}, {
            get: (_, prop) => (prop === 'language' ? 'en' : undefined),
        }),
    },
};
(globalThis as Record<string, unknown>).preactHooks ??= require('preact/hooks');
(globalThis as Record<string, unknown>).log ??= {
    dbg: () => {},
    info: () => {},
    error: () => {},
    setLogLevel: () => {},
};

import { FiltersMetaStore } from '../../modules/common/stores/FiltersMetaStore';
import { FiltersIndex, FiltersDefinedGroups, FiltersIds } from '../../modules/common/apis/types';

describe('FiltersMetaStore', () => {
    let store: FiltersMetaStore;

    beforeEach(() => {
        store = new FiltersMetaStore();
    });

    it('initializes with empty filters', () => {
        assert.equal(store.filters.filters.length, 0);
        assert.equal(store.filters.customFilters.length, 0);
    });

    it('initializes with empty enabled filters', () => {
        assert.equal(store.enabledFilters.size, 0);
    });

    it('initializes with false language specific', () => {
        assert.equal(store.languageSpecific, false);
    });

    it('setEnabledFilters updates enabled set', () => {
        store.setEnabledFilters([1, 2, 3]);
        assert.equal(store.enabledFilters.size, 3);
        assert.equal(store.enabledFilters.has(1), true);
        assert.equal(store.enabledFilters.has(2), true);
        assert.equal(store.enabledFilters.has(3), true);
    });

    it('updateLocalEnabledFilters adds ids when enabled', () => {
        store.setEnabledFilters([1, 2]);
        store.updateLocalEnabledFilters([3, 4], true);
        assert.equal(store.enabledFilters.has(3), true);
        assert.equal(store.enabledFilters.has(4), true);
    });

    it('updateLocalEnabledFilters removes ids when disabled', () => {
        store.setEnabledFilters([1, 2, 3]);
        store.updateLocalEnabledFilters([2, 3], false);
        assert.equal(store.enabledFilters.has(1), true);
        assert.equal(store.enabledFilters.has(2), false);
        assert.equal(store.enabledFilters.has(3), false);
    });

    it('updateLanguageSpecific sets local state', () => {
        store.updateLanguageSpecific(true);
        assert.equal(store.languageSpecific, true);
    });

    it('setIndex populates group mappings', () => {
        const idx = new FiltersIndex();
        idx.definedGroups = new FiltersDefinedGroups({
            adBlocking: 1,
            privacy: 2,
            socialWidgets: 3,
            annoyances: 4,
            security: 5,
            other: 6,
            languageSpecific: 7,
        });
        idx.cookieNoticeFilterId = 100;
        idx.popUpsFilterId = 101;
        idx.widgetsFilterId = 102;
        idx.otherAnnoyanceFilterId = 103;
        idx.unblockSearchAdsFilterId = 999;

        const recMap = new Map<number, FiltersIds>();
        recMap.set(1, new FiltersIds({ ids: [1, 2, 3] }));
        recMap.set(2, new FiltersIds({ ids: [10, 11] }));
        recMap.set(4, new FiltersIds({ ids: [30] }));
        recMap.set(7, new FiltersIds({ ids: [60] }));
        idx.recommendedFiltersIdsByGroupDict = recMap;

        const otherMap = new Map<number, FiltersIds>();
        otherMap.set(4, new FiltersIds({ ids: [] }));
        idx.otherFiltersIdsByGroupDict = otherMap;

        const filtersByGroupsMap = new Map<number, FiltersIds>();
        idx.filtersByGroups = filtersByGroupsMap;

        store.setIndex(idx);

        assert.equal(store.recommendedFiltersByGroups['1']?.length, 3);
        assert.equal(store.recommendedFiltersByGroups['2']?.length, 2);
        assert.equal(store.filtersIdsWithConsent.includes(100), true);
        assert.equal(store.filtersIdsWithConsent.includes(101), true);
        assert.equal(store.filtersIdsWithConsent.includes(102), true);
        assert.equal(store.filtersIdsWithConsent.includes(103), true);
    });
});
