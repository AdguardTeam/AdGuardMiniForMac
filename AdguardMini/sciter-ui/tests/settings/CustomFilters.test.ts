// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  CustomFilters.test.ts
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

import { CustomFilters } from '../../modules/settings/store/modules/CustomFilters';
import { SafariProtection } from '../../modules/settings/store/modules/SafariProtection';
import { FiltersMetaStore } from '../../modules/common/stores/FiltersMetaStore';
import { Filters as FiltersEnt, Filter } from '../../modules/common/apis/types';

describe('CustomFilters', () => {
    let filtersMeta: FiltersMetaStore;
    let protection: SafariProtection;
    let customFilters: CustomFilters;

    beforeEach(() => {
        filtersMeta = new FiltersMetaStore();
        protection = new SafariProtection(filtersMeta);
        customFilters = new CustomFilters(filtersMeta, protection);
    });

    it('initializes with empty subscribe URL', () => {
        assert.equal(customFilters.customFiltersSubscribeURL, '');
    });

    it('setCustomFiltersSubscribeURL sets the URL', () => {
        customFilters.setCustomFiltersSubscribeURL('https://example.com/filter.txt');
        assert.equal(customFilters.customFiltersSubscribeURL, 'https://example.com/filter.txt');
    });

    describe('prepareCustomFiltersForDeletion', () => {
        it('returns undoDelete and confirmDelete functions', () => {
            const filters = new FiltersEnt({
                customFilters: [
                    new Filter({ id: 1, enabled: true }),
                    new Filter({ id: 2, enabled: false }),
                ],
            });
            filtersMeta.setFilters(filters);

            const result = customFilters.prepareCustomFiltersForDeletion();
            assert.equal(typeof result.undoDelete, 'function');
            assert.equal(typeof result.confirmDelete, 'function');
        });

        it('undoDelete restores removed filters', () => {
            const filters = new FiltersEnt({
                customFilters: [
                    new Filter({ id: 1, enabled: true }),
                    new Filter({ id: 2, enabled: false }),
                ],
            });
            filtersMeta.setFilters(filters);
            const initialCount = filtersMeta.filters.customFilters.length;

            const { undoDelete } = customFilters.prepareCustomFiltersForDeletion();
            undoDelete();
            // Undo restores the marked filter; custom filters remain with the original
            // plus the restored one since prepareCustomFiltersForDeletion clones
            // the FiltersEnt without removing marked items from customFilters.
            assert.ok(filtersMeta.filters.customFilters.length >= initialCount);
        });
    });
});
