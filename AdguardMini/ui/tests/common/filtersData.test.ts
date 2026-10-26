// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    FiltersDefinedGroups,
    FiltersIds,
    FiltersIndex,
} from 'Apis/types';
import { FiltersData } from 'Common/stores/FiltersData';
import { Filters } from 'Modules/settings/store/modules/Filters';

test('isLoaded waits for both enabled filters and the filters index', () => {
    const filters = new FiltersData();

    assert.equal(filters.isLoaded, false);

    filters.setEnabledFilters([1]);
    assert.equal(filters.isLoaded, false);

    filters.setIndex(new FiltersIndex());
    assert.equal(filters.isLoaded, true);
});

test('isLoaded waits for enabled filters when the index arrives first', () => {
    const filters = new FiltersData();

    filters.setIndex(new FiltersIndex());
    assert.equal(filters.isLoaded, false);

    filters.setEnabledFilters([]);
    assert.equal(filters.isLoaded, true);
});

test('the settings Filters store keeps the loaded computed', () => {
    const filters = new Filters();

    assert.equal(filters.isLoaded, false);

    filters.setEnabledFilters([]);
    filters.setIndex(new FiltersIndex({
        definedGroups: new FiltersDefinedGroups(),
        recommendedFiltersIdsByGroupDict: new Map([[0, new FiltersIds({ ids: [] })]]),
        otherFiltersIdsByGroupDict: new Map([[0, new FiltersIds({ ids: [] })]]),
    }));

    assert.equal(filters.isLoaded, true);
});
