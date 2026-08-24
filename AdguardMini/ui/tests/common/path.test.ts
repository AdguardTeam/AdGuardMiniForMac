// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dirname } from '../../modules/common/utils/path';

test('dirname returns the directory of an absolute path', () => {
    assert.equal(dirname('/Users/x/Documents/file.txt'), '/Users/x/Documents');
});

test('dirname strips the suggested filename from an export path', () => {
    assert.equal(dirname('/Users/x/Documents/adguard_mini_20260812120000'), '/Users/x/Documents');
});

test('dirname yields empty for a bare export path (Documents fallback applies)', () => {
    // Matches the legacy split/pop/join behavior: the directory of a bare
    // "/name" path is empty, and the Swift panel resolves it to Documents.
    assert.equal(dirname('/adguard_mini_20260812120000'), '');
});

test('dirname returns empty for a bare filename', () => {
    assert.equal(dirname('adguard_mini_20260812120000'), '');
});
