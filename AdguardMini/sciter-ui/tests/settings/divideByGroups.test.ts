// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { divideByGroups } from '../../modules/settings/components/Filters/helpers';

import type { Filter, FilterGroup } from '../../modules/common/apis/types';

describe('divideByGroups', () => {
    it('groups filters by their groupId', () => {
        const filters = [
            { id: 1, groupId: 10, title: 'a', enabled: true } as Filter,
            { id: 2, groupId: 10, title: 'b', enabled: true } as Filter,
            { id: 3, groupId: 20, title: 'c', enabled: true } as Filter,
        ];
        const groups = [
            { groupId: 10, groupName: 'Group A', displayNumber: 1 } as FilterGroup,
            { groupId: 20, groupName: 'Group B', displayNumber: 2 } as FilterGroup,
        ];

        const result = divideByGroups(filters, groups);
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].filters.length, 2);
        assert.strictEqual(result[1].filters.length, 1);
    });

    it('returns empty array when no filters match groups', () => {
        const filters = [{ id: 1, groupId: 99, title: 'a', enabled: true } as Filter];
        const groups = [{ groupId: 10, groupName: 'G', displayNumber: 1 } as FilterGroup];

        const result = divideByGroups(filters, groups);
        assert.strictEqual(result.length, 0);
    });

    it('returns empty array for empty input', () => {
        assert.strictEqual(divideByGroups([], []).length, 0);
    });
});
