// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { selectFile } from 'Common/utils/selectFile';

beforeEach(() => {
    (globalThis as unknown as { window: Record<string, unknown> }).window =
        globalThis as unknown as Record<string, unknown>;
});

afterEach(() => {
    delete (globalThis as unknown as { API?: unknown }).API;
    delete (globalThis as unknown as { window?: unknown }).window;
});

test('selectFile calls SettingsService.SelectFile with parsed extensions and resolves the path', async () => {
    const calls: unknown[] = [];
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: async (req: unknown) => {
            calls.push(req);
            return { path: '/Users/test/Desktop/rules.txt' };
        },
    };

    let resolved: string | undefined;
    await selectFile(
        false,
        '(*.txt)|*.txt',
        'Import',
        '/Users/test/Documents',
        async (path: string) => { resolved = path; },
    );

    assert.equal(calls.length, 1);
    const req = calls[0] as { FQN: string; getRequestMessage(): { toObject(): Record<string, unknown> } };
    assert.equal(req.FQN, 'SettingsService.SelectFile');
    const obj = req.getRequestMessage().toObject() as Record<string, unknown>;
    assert.equal(obj.isSave, false);
    assert.equal(obj.allowedExtensions, 'txt');
    assert.equal(obj.initialPath, '/Users/test/Documents');
    assert.equal(resolved, '/Users/test/Desktop/rules.txt');
});

test('selectFile does not call onSuccess when the panel was cancelled', async () => {
    let called = false;
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: async () => ({ path: '' }),
    };
    await selectFile(true, undefined, 'Export', '', async () => { called = true; });
    assert.equal(called, false);
});
