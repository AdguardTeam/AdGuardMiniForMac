// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { store, __resetSettingsTestStore } from '../mocks/settingsStore';
import { windowing, __resetWindowingForTests } from '../mocks/settingsStore/modules/Windowing';
import { UserRulesCallbackServiceInternal } from '../../modules/common/apis/callbacks/UserRulesCallbackServiceInternal';
import { EmptyValue, UserRulesCallbackState } from '../../modules/common/apis/types';

/**
 * Behavioral tests for `UserRulesCallbackServiceInternal` — the 2
 * `UserRulesCallbackService` pushes' effects on the settings store +
 * windowing singleton.
 */

test('onUserFilterChange stores the rules from the callback', async () => {
    __resetSettingsTestStore();
    const received: unknown[] = [];
    store.userRules = { setFromCallback: (s: unknown) => { received.push(s); } };

    const service = new UserRulesCallbackServiceInternal();
    const param = new UserRulesCallbackState();
    await service.onUserFilterChange(param);

    assert.deepEqual(received, [param]);
});

test('onUserRulesWindowClosed marks the editor closed and re-fetches rules', async () => {
    __resetSettingsTestStore();
    __resetWindowingForTests();
    const closedValues: boolean[] = [];
    let userRulesCalls = 0;
    windowing.setUserRulesEditorWindowOpened = (v: boolean) => { closedValues.push(v); };
    store.userRules = { getUserRules: () => { userRulesCalls++; } };

    const service = new UserRulesCallbackServiceInternal();
    await service.onUserRulesWindowClosed(new EmptyValue());

    assert.deepEqual(closedValues, [false]);
    assert.equal(userRulesCalls, 1);
});
