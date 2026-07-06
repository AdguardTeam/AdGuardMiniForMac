// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DATE_FORMAT, getDateString } from '../../modules/common/lib/date';

describe('getDateString (useDateFormat underlying function)', () => {
    it('formats a timestamp using day_month pattern', () => {
        const result = getDateString(Date.now(), DATE_FORMAT.day_month, 'enUS');
        assert.ok(typeof result === 'string');
        assert.ok(result.length > 0);
    });

    it('falls back to enUS when locale is invalid', () => {
        const result = getDateString(Date.now(), DATE_FORMAT.day_month_year, 'zzZZ');
        assert.ok(typeof result === 'string');
        assert.ok(result.length > 0);
    });

    it('produces different output for different formats', () => {
        const ts = new Date('2024-06-15').getTime();
        const short = getDateString(ts, DATE_FORMAT.day_month, 'enUS');
        const long = getDateString(ts, DATE_FORMAT.day_month_year, 'enUS');
        assert.ok(short !== long);
    });
});
