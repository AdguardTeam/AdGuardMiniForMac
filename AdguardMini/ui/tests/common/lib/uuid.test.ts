// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generateUuid } from '../../../modules/common/lib/uuid';

test('generateUuid returns a valid UUID v4 string', () => {
    const uuid = generateUuid();
    // RFC 4122 v4: 8-4-4-4-12 hex, version nibble = 4, variant = 8|9|a|b.
    assert.match(
        uuid,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
});

test('generateUuid falls back to a valid UUID when crypto.randomUUID is unavailable', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
        const uuid = generateUuid();
        assert.match(
            uuid,
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
    } finally {
        Object.defineProperty(crypto, 'randomUUID', {
            value: original,
            configurable: true,
            writable: true,
        });
    }
});
