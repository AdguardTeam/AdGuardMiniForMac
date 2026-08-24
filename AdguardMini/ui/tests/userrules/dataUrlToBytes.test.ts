// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dataUrlToBytes } from '../../modules/userrules/lib/dataUrlToBytes';

/**
 * Encodes bytes the way webpack `asset/inline` does (base64 data URL).
 */
const toDataUrl = (mime: string, bytes: number[]): string => (
    `data:${mime};base64,${btoa(String.fromCharCode(...bytes))}`
);

test('decodes a base64 data URL into the original bytes', () => {
    const bytes = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0xff];
    const decoded = dataUrlToBytes(toDataUrl('application/wasm', bytes));
    assert.ok(decoded instanceof ArrayBuffer);
    assert.deepEqual(Array.from(new Uint8Array(decoded)), bytes);
});

test('ignores the mime type and handles a non-base64 payload delimiter', () => {
    const bytes = [0x01, 0x02, 0x03, 0x04];
    const decoded = dataUrlToBytes(toDataUrl('application/octet-stream', bytes));
    assert.deepEqual(Array.from(new Uint8Array(decoded)), bytes);
});

test('throws on input that is not a comma-separated data URL', () => {
    assert.throws(() => dataUrlToBytes('not-a-data-url'), /Invalid data URL/);
});
