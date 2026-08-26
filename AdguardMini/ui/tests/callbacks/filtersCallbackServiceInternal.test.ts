// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { store, __resetSettingsTestStore } from '../mocks/settingsStore';
import { FiltersCallbackServiceInternal } from '../../modules/common/apis/callbacks/FiltersCallbackServiceInternal';
import { RouteName } from '../../modules/settings/store/modules/SettingsRouter';
import { EmptyValue, FiltersIndex, StringValue } from '../../modules/common/apis/types';

/**
 * Behavioral tests for `FiltersCallbackServiceInternal` — the 3
 * `FiltersCallbackService` pushes' effects on the settings store.
 */

test('OnFiltersUpdate re-fetches the filters metadata', async () => {
    __resetSettingsTestStore();
    let filtersCalls = 0;
    store.filters = { getFilters: () => { filtersCalls++; } };

    const service = new FiltersCallbackServiceInternal();
    await service.OnFiltersUpdate(new EmptyValue());

    assert.equal(filtersCalls, 1);
});

test('OnFiltersIndexUpdate stores the new index and re-fetches metadata', async () => {
    __resetSettingsTestStore();
    const received: unknown[] = [];
    let filtersCalls = 0;
    store.filters = {
        setIndex: (i: unknown) => { received.push(i); },
        getFilters: () => { filtersCalls++; },
    };

    const service = new FiltersCallbackServiceInternal();
    const param = new FiltersIndex();
    await service.OnFiltersIndexUpdate(param);

    assert.deepEqual(received, [param]);
    assert.equal(filtersCalls, 1);
});

test('OnCustomFiltersSubscribe navigates to the custom group and stores the URL', async () => {
    __resetSettingsTestStore();
    const navigated: Array<{ path: string; params: unknown }> = [];
    const urls: string[] = [];
    store.router = { changePath: (p: string, params?: unknown) => { navigated.push({ path: p, params }); } };
    store.filters = {
        filtersIndex: { customGroupId: 42 },
        setCustomFiltersSubscribeURL: (url: string) => { urls.push(url); },
    };

    const service = new FiltersCallbackServiceInternal();
    await service.OnCustomFiltersSubscribe(new StringValue({ value: 'https://example.com/filter.txt' }));

    assert.equal(navigated.length, 1);
    assert.equal(navigated[0].path, RouteName.filters);
    assert.deepEqual(navigated[0].params, { groupId: 42 });
    assert.deepEqual(urls, ['https://example.com/filter.txt']);
});
