// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { OpenUserRulesWindowRequest } from 'Apis/requests/InternalService';
import { windowing } from 'Modules/settings/store/modules/Windowing';

import { openUserRulesWindow } from 'Modules/settings/lib/openUserRulesWindow';

beforeEach(() => {
    windowing.setUserRulesEditorWindowOpened(false);
    (globalThis as unknown as { window: Record<string, unknown> }).window =
        globalThis as unknown as Record<string, unknown>;
});

afterEach(() => {
    delete (globalThis as unknown as { API?: unknown }).API;
    delete (globalThis as unknown as { window?: unknown }).window;
});

test('openUserRulesWindow fires the OpenUserRulesWindow RPC and marks the window open', () => {
    const calls: unknown[] = [];
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<void> } }).API = {
        Execute: (req: unknown) => { calls.push(req); return Promise.resolve(); },
    };

    openUserRulesWindow();

    assert.equal(calls.length, 1);
    // `FQN` is an instance getter on the generated request class.
    assert.equal(
        (calls[0] as { FQN: string }).FQN,
        'InternalService.OpenUserRulesWindow',
    );
    assert.equal(
        windowing.getIsUserRulesEditorWindowOpened(),
        true,
    );
});
