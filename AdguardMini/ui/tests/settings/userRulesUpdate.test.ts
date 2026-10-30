// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

// A rejected delete must put the optimistically removed rule back.

import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { OptionalError, UserRule, UserRules as UserRulesEnt } from 'Apis/types';

import { UserRules } from 'Modules/settings/store/modules/UserRules';

beforeEach(() => {
    (globalThis as unknown as { window: Record<string, unknown> }).window =
        globalThis as unknown as Record<string, unknown>;
});

afterEach(() => {
    delete (globalThis as unknown as { API?: unknown }).API;
    delete (globalThis as unknown as { window?: unknown }).window;
});

/**
 * Installs a platform stub whose rule update is rejected.
 *
 * @param seeded Rules the store loads before the delete.
 */
function installRejectingUpdateApi(seeded: UserRulesEnt): void {
    (globalThis as unknown as { API: { Execute(req: { FQN: string }): Promise<unknown> } }).API = {
        Execute: (req) => {
            if (req.FQN === 'UserRulesService.GetUserRules') {
                return Promise.resolve(seeded);
            }

            if (req.FQN === 'UserRulesService.UpdateUserRules') {
                return Promise.resolve(new OptionalError({ hasError: true }));
            }

            throw new Error(`Unexpected request: ${req.FQN}`);
        },
    };
}

test('restoreRules puts back a rule removed by a rejected delete', async () => {
    installRejectingUpdateApi(new UserRulesEnt({
        enabled: true,
        rules: [
            new UserRule({ rule: '||first.example^', enabled: true }),
            new UserRule({ rule: '||second.example^', enabled: true }),
        ],
    }));
    const store = new UserRules();
    await store.getUserRules();

    const [error, prevRules] = await store.updateRules(store.userRules.rules.filter((_, index) => index !== 0));

    assert.equal(error?.hasError, true, 'the platform rejected the write');
    assert.deepEqual(store.rules.map((rule) => rule.rule), ['||second.example^'], 'the delete applies optimistically');

    store.restoreRules(prevRules);

    assert.deepEqual(
        store.rules.map((rule) => rule.rule),
        ['||first.example^', '||second.example^'],
        'the rejected delete is rolled back',
    );
});
