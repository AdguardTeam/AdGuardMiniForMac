// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GlobalSettings } from '../../../modules/common/apis/types/Settings';
import { resolveLastFiltersUpdateTimestamp } from '../../../modules/tray/components/CheckUpdates/resolveLastFiltersUpdateTimestamp';

test('returns timestamp only for nothing-to-update status', () => {
    assert.equal(
        resolveLastFiltersUpdateTimestamp('nothingToUpdate', 1_715_000_000_123),
        1_715_000_000_123,
    );
    assert.equal(resolveLastFiltersUpdateTimestamp('updated', 1_715_000_000_123), null);
    assert.equal(resolveLastFiltersUpdateTimestamp('error', 1_715_000_000_123), null);
    assert.equal(resolveLastFiltersUpdateTimestamp(null, 1_715_000_000_123), null);
});

test('returns null for missing or invalid timestamps', () => {
    assert.equal(resolveLastFiltersUpdateTimestamp('nothingToUpdate', 0), null);
    assert.equal(resolveLastFiltersUpdateTimestamp('nothingToUpdate', -1), null);
    assert.equal(resolveLastFiltersUpdateTimestamp('nothingToUpdate', Number.NaN), null);
    assert.equal(resolveLastFiltersUpdateTimestamp('nothingToUpdate', Number.POSITIVE_INFINITY), null);
    assert.equal(resolveLastFiltersUpdateTimestamp('nothingToUpdate', undefined), null);
});

test('global settings carries lastFiltersUpdateTimestampMs field', () => {
    const settings = new GlobalSettings({
        enabled: true,
        newVersionAvailable: false,
        lastFiltersUpdateTimestampMs: 1_715_000_000_123,
    });

    assert.equal(settings.lastFiltersUpdateTimestampMs, 1_715_000_000_123);
});
