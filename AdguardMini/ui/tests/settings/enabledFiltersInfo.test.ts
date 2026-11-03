// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getEnabledFiltersInfo } from '../../modules/settings/components/SafariExtension/getEnabledFiltersInfo';

const filtersMap = new Map<number, { title: string }>([
    [1, { title: 'AdGuard Base filter' }],
    [2, { title: 'AdGuard Russian filter' }],
    [3, { title: 'Peter Lowe\'s Blocklist' }],
    [4, { title: 'Online Malicious URL Blocklist' }],
    [5, { title: 'Phishing URL Blocklist' }],
    [6, { title: 'Scam Blocklist by DurableNapkin' }],
]);

test('getEnabledFiltersInfo shows every enabled filter when there are four or fewer', () => {
    assert.deepEqual(getEnabledFiltersInfo([1, 2, 3, 4], filtersMap), {
        names: [
            'AdGuard Base filter',
            'AdGuard Russian filter',
            'Peter Lowe\'s Blocklist',
            'Online Malicious URL Blocklist',
        ],
        moreCount: 0,
    });
    assert.deepEqual(getEnabledFiltersInfo([], filtersMap), { names: [], moreCount: 0 });
});

test('getEnabledFiltersInfo counts the fifth enabled filter as "and 1 more"', () => {
    assert.deepEqual(getEnabledFiltersInfo([1, 2, 3, 4, 5], filtersMap), {
        names: [
            'AdGuard Base filter',
            'AdGuard Russian filter',
            'Peter Lowe\'s Blocklist',
            'Online Malicious URL Blocklist',
        ],
        moreCount: 1,
    });
});

test('getEnabledFiltersInfo reports every filter beyond the fourth in the counter', () => {
    assert.equal(getEnabledFiltersInfo([1, 2, 3, 4, 5, 6], filtersMap).moreCount, 2);
});

test('getEnabledFiltersInfo counts an enabled filter whose metadata is missing', () => {
    const info = getEnabledFiltersInfo([1, 2, 3, 4, 42], filtersMap);

    assert.equal(info.names.length, 4);
    assert.equal(info.names.length + info.moreCount, 5);
});
