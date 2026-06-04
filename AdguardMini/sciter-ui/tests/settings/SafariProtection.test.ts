// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariProtection.test.ts
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
import { SafariProtection } from '../../modules/settings/store/modules/SafariProtection';
import { FiltersIndex, FiltersDefinedGroups, FiltersIds, Filters as FiltersEnt, Filter } from '../../modules/common/apis/types';

/**
 * Create a FiltersIndex with test data for health-check computed tests.
 */
function createTestFiltersIndex(): FiltersIndex {
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
    idx.unblockSearchAdsFilterId = 999;
    idx.cookieNoticeFilterId = 100;
    idx.popUpsFilterId = 101;
    idx.widgetsFilterId = 102;
    idx.otherAnnoyanceFilterId = 103;

    const recGroups: Record<number, number[]> = {
        1: [1, 2, 3],   // ad blocking
        2: [10, 11, 12], // privacy
        3: [20, 21],     // social widgets
        4: [30],         // annoyances
        5: [40],         // security
        6: [50],         // other
        7: [60],         // language specific
    };
    const recMap = new Map<number, FiltersIds>();
    for (const [k, ids] of Object.entries(recGroups)) {
        recMap.set(Number(k), new FiltersIds({ ids }));
    }
    idx.recommendedFiltersIdsByGroupDict = recMap;

    idx.otherFiltersIdsByGroupDict = new Map<number, FiltersIds>();
    idx.otherFiltersIdsByGroupDict.set(4, new FiltersIds({ ids: [] }));
    idx.filtersByGroups = new Map<number, FiltersIds>();

    return idx;
}

describe('SafariProtection (health-check computeds)', () => {
    let filtersMeta: FiltersMetaStore;
    let protection: SafariProtection;

    beforeEach(() => {
        filtersMeta = new FiltersMetaStore();
        filtersMeta.setIndex(createTestFiltersIndex());
        protection = new SafariProtection(filtersMeta);
    });

    describe('blockAds', () => {
        it('returns true when all recommended ad blocking filters are enabled', () => {
            filtersMeta.setEnabledFilters([1, 2, 3]);
            assert.equal(protection.blockAds, true);
        });

        it('returns false when a recommended ad blocking filter is disabled', () => {
            filtersMeta.setEnabledFilters([1]);
            assert.equal(protection.blockAds, false);
        });

        it('returns false when no ad blocking filters are enabled', () => {
            assert.equal(protection.blockAds, false);
        });
    });

    describe('blockSearchAds', () => {
        it('returns false when unblockSearchAds filter IS enabled', () => {
            filtersMeta.setEnabledFilters([999]);
            assert.equal(protection.blockSearchAds, false);
        });

        it('returns true when unblockSearchAds filter is NOT enabled', () => {
            assert.equal(protection.blockSearchAds, true);
        });
    });

    describe('blockTrackers', () => {
        it('returns true when all recommended privacy filters are enabled', () => {
            filtersMeta.setEnabledFilters([10, 11, 12]);
            assert.equal(protection.blockTrackers, true);
        });

        it('returns false when a privacy filter is missing', () => {
            filtersMeta.setEnabledFilters([10]);
            assert.equal(protection.blockTrackers, false);
        });
    });

    describe('blockSocialButtons', () => {
        it('returns true when all social widget filters are enabled', () => {
            filtersMeta.setEnabledFilters([20, 21]);
            assert.equal(protection.blockSocialButtons, true);
        });

        it('returns false when not all social widget filters are enabled', () => {
            filtersMeta.setEnabledFilters([20]);
            assert.equal(protection.blockSocialButtons, false);
        });
    });

    describe('blockCookieNotice', () => {
        it('returns true when cookie notice filter is enabled', () => {
            filtersMeta.setEnabledFilters([100]);
            assert.equal(protection.blockCookieNotice, true);
        });

        it('returns false when cookie notice filter is not enabled', () => {
            assert.equal(protection.blockCookieNotice, false);
        });
    });

    describe('blockPopups', () => {
        it('returns true when popups filter is enabled', () => {
            filtersMeta.setEnabledFilters([101]);
            assert.equal(protection.blockPopups, true);
        });

        it('returns false when popups filter is not enabled', () => {
            assert.equal(protection.blockPopups, false);
        });
    });

    describe('blockWidgets', () => {
        it('returns true when widgets filter is enabled', () => {
            filtersMeta.setEnabledFilters([102]);
            assert.equal(protection.blockWidgets, true);
        });

        it('returns false when widgets filter is not enabled', () => {
            assert.equal(protection.blockWidgets, false);
        });
    });

    describe('blockOtherAnnoyance', () => {
        it('returns true when other annoyance filter is enabled', () => {
            filtersMeta.setEnabledFilters([103]);
            assert.equal(protection.blockOtherAnnoyance, true);
        });

        it('returns false when other annoyance filter is not enabled', () => {
            assert.equal(protection.blockOtherAnnoyance, false);
        });
    });

    describe('enabledCustomFiltersCount', () => {
        it('returns the count of enabled custom filters', () => {
            filtersMeta.setFilters(new FiltersEnt({
                customFilters: [
                    new Filter({ enabled: true }),
                    new Filter({ enabled: false }),
                    new Filter({ enabled: true }),
                ],
            }));
            assert.equal(protection.enabledCustomFiltersCount, 2);
        });

        it('returns 0 when no custom filters are enabled', () => {
            filtersMeta.setFilters(new FiltersEnt({
                customFilters: [new Filter({ enabled: false })],
            }));
            assert.equal(protection.enabledCustomFiltersCount, 0);
        });
    });

    describe('languageSpecificEnabled', () => {
        it('returns true when any language-specific filter is enabled', () => {
            filtersMeta.setEnabledFilters([60]);
            assert.equal(protection.languageSpecificEnabled, true);
        });

        it('returns false when no language-specific filters are enabled', () => {
            assert.equal(protection.languageSpecificEnabled, false);
        });
    });
});
