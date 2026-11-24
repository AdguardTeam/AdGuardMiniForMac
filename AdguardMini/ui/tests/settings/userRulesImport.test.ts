// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

// A failed import must leave the displayed rules untouched.

import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'vitest';

import { UserRule, UserRules as UserRulesEnt, UserRulesOrError } from 'Apis/types';

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
 * Installs an `API.Execute` stub for the user-rules flow and collects the
 * dispatched requests.
 *
 * @param reply Reply the import call resolves to.
 * @param seeded Rules the pull returns when the store loads them.
 * @returns The dispatched requests, in call order.
 */
function installUserRulesApi(reply: UserRulesOrError, seeded: UserRulesEnt): unknown[] {
    const calls: unknown[] = [];
    (globalThis as unknown as { API: { Execute(req: unknown): Promise<unknown> } }).API = {
        Execute: (req: unknown) => {
            calls.push(req);
            const fqn = (req as { FQN: string }).FQN;
            switch (fqn) {
                case 'UserRulesService.GetUserRules':
                    return Promise.resolve(seeded);
                case 'UserRulesService.ImportUserRules':
                    return Promise.resolve(reply);
                default:
                    throw new Error(`Unexpected request: ${fqn}`);
            }
        },
    };

    return calls;
}

/**
 * Rules the store displays before an import is attempted.
 */
function makeSeededRules(): UserRulesEnt {
    return new UserRulesEnt({
        enabled: true,
        rules: [new UserRule({ rule: '||seeded.example^', enabled: true })],
    });
}

/**
 * A reply that carries rules replaces the displayed list and reports success.
 */
test('importUserRules applies the returned rules and reports success', async () => {
    const path = '/Users/test/user_rules.txt';
    const imported = new UserRulesEnt({
        enabled: true,
        rules: [new UserRule({ rule: '||example.org^$hide', enabled: true })],
    });
    const calls = installUserRulesApi(new UserRulesOrError({ userRules: imported }), makeSeededRules());
    const store = new UserRules();
    await store.getUserRules();

    const applied = await store.importUserRules(path);

    assert.equal(applied, true);
    assert.equal(store.userRules, imported);
    assert.deepEqual(store.rules, [
        { rule: '||example.org^$hide', enabled: true, index: 0 },
    ]);

    assert.equal(calls.length, 2);
    const importRequest = calls[1] as {
        FQN: string;
        getRequestMessage(): { toObject(): Record<string, unknown> };
    };
    assert.equal(importRequest.FQN, 'UserRulesService.ImportUserRules');
    assert.equal(importRequest.getRequestMessage().toObject().path, path);
});

test('importUserRules reports an error reply and keeps the displayed rules', async () => {
    const path = '/Users/test/user_rules.txt';
    installUserRulesApi(new UserRulesOrError({ error: true }), makeSeededRules());
    const store = new UserRules();
    await store.getUserRules();
    const displayedUserRules = store.userRules;
    const displayedRules = store.rules;

    const applied = await store.importUserRules(path);

    assert.equal(applied, false);
    assert.equal(store.userRules, displayedUserRules);
    assert.equal(store.rules, displayedRules);
});

test('importUserRules reports a failure when the reply carries no rules', async () => {
    const path = '/Users/test/user_rules.txt';
    installUserRulesApi(new UserRulesOrError(), makeSeededRules());
    const store = new UserRules();
    await store.getUserRules();
    const displayedUserRules = store.userRules;
    const displayedRules = store.rules;

    const applied = await store.importUserRules(path);

    assert.equal(applied, false);
    assert.equal(store.userRules, displayedUserRules);
    assert.equal(store.rules, displayedRules);
});

test('importUserRules applies a reply whose rules are empty', async () => {
    const path = '/Users/test/empty_user_rules.txt';
    const imported = new UserRulesEnt({ enabled: true, rules: [] });
    installUserRulesApi(new UserRulesOrError({ userRules: imported }), makeSeededRules());
    const store = new UserRules();
    await store.getUserRules();

    const applied = await store.importUserRules(path);

    assert.equal(applied, true);
    assert.deepEqual(store.rules, []);
});
