// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { store, __resetSettingsTestStore } from '../mocks/settingsStore';
import { AccountCallbackServiceInternal } from '../../modules/common/apis/callbacks/AccountCallbackServiceInternal';
import { EmptyValue, LicenseOrError } from '../../modules/common/apis/types';

/**
 * Behavioral tests for `AccountCallbackServiceInternal` — the single
 * `AccountCallbackService.OnLicenseUpdate` push's effects on the settings
 * store (trial availability, license, settings + advanced-blocking refresh).
 */

test('OnLicenseUpdate refreshes trial, stores license and refreshes dependent data', async () => {
    __resetSettingsTestStore();
    const calls: string[] = [];
    store.account = {
        getTrialAvailability: async () => { calls.push('trial'); },
        setLicense: (l: unknown) => { calls.push(`license:${(l as LicenseOrError).has_error}`); },
    };
    store.settings = { getSettings: () => { calls.push('settings'); } };
    store.advancedBlocking = { getAdvancedBlocking: () => { calls.push('advancedBlocking'); } };

    const service = new AccountCallbackServiceInternal();
    const param = new LicenseOrError({ error: true });
    await service.OnLicenseUpdate(param);

    assert.deepEqual(calls, ['trial', 'license:true', 'settings', 'advancedBlocking']);
});

test('OnLicenseUpdate awaits trial availability before storing the license', async () => {
    __resetSettingsTestStore();
    const order: string[] = [];
    store.account = {
        // Deliberately slow trial resolution — the license must NOT be stored
        // before it completes.
        getTrialAvailability: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            order.push('trial');
        },
        setLicense: () => { order.push('setLicense'); },
    };
    store.settings = { getSettings: () => {} };
    store.advancedBlocking = { getAdvancedBlocking: () => {} };

    const service = new AccountCallbackServiceInternal();
    await service.OnLicenseUpdate(new LicenseOrError());

    assert.deepEqual(order, ['trial', 'setLicense']);
});

test('OnLicenseUpdate returns EmptyValue', async () => {
    __resetSettingsTestStore();
    store.account = { getTrialAvailability: async () => {}, setLicense: () => {} };
    store.settings = { getSettings: () => {} };
    store.advancedBlocking = { getAdvancedBlocking: () => {} };

    const service = new AccountCallbackServiceInternal();
    const result = await service.OnLicenseUpdate(new LicenseOrError());

    assert.ok(result instanceof EmptyValue);
});
