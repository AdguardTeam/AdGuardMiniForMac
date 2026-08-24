// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { store, __resetSettingsTestStore } from '../mocks/settingsStore';
import { SettingsCallbackServiceInternal } from '../../modules/common/apis/callbacks/SettingsCallbackServiceInternal';
import {
    NotificationContext,
    NotificationsQueueType,
    NotificationsQueueIconType,
} from '../../modules/common/stores/NotificationsQueue';
// Installs the ambient `translate` global the internals call at runtime
// (`tests/mocks/intl.ts`).
import 'Intl';
import {
    EmptyValue,
    BoolValue,
    StringValue,
    EffectiveThemeValue,
    EffectiveTheme,
    ImportMode,
    SafariExtensionUpdate,
    ImportStatus,
    URLFilterState,
} from '../../modules/common/apis/types';

/**
 * Behavioral tests for `SettingsCallbackServiceInternal` — what each of the
 * 10 `SettingsCallbackService` pushes actually does to the settings store.
 * The store singleton is mocked via the `SettingsStore` path mapping
 * (`tests/mocks/settingsStore`).
 */

const makeNotifySpy = () => {
    const calls: Array<{ props: unknown; closeOthers?: boolean }> = [];
    const notify = (props: unknown, closeOthers?: boolean) => {
        calls.push({ props, closeOthers });
    };
    return { notify, calls };
};

test('OnSafariExtensionUpdate forwards the update to the settings store', async () => {
    __resetSettingsTestStore();
    const received: unknown[] = [];
    let groupedFiltersCalls = 0;
    store.settings = { updateSafariExtension: (u: unknown) => { received.push(u); } };
    store.filters = { getFiltersGroupedByExtension: () => { groupedFiltersCalls++; } };
    const param = new SafariExtensionUpdate();

    const service = new SettingsCallbackServiceInternal();
    await service.OnSafariExtensionUpdate(param);

    assert.deepEqual(received, [param]);
    // The grouped-filters re-fetch is debounced (100ms); let it fire while
    // the fake store is still installed so no stray timer runs later.
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(groupedFiltersCalls, 1);
});

test('OnLoginItemStateChange forwards the value to setLoginItem', async () => {
    __resetSettingsTestStore();
    const received: boolean[] = [];
    store.settings = { setLoginItem: (v: boolean) => { received.push(v); } };

    const service = new SettingsCallbackServiceInternal();
    await service.OnLoginItemStateChange(new BoolValue({ value: true }));

    assert.deepEqual(received, [true]);
});

test('OnImportStateChange success refreshes data and notifies', async () => {
    __resetSettingsTestStore();
    const calls: string[] = [];
    const { notify, calls: notifyCalls } = makeNotifySpy();
    store.filters = {
        getFilters: () => { calls.push('filters'); },
        getEnabledFilters: () => { calls.push('enabledFilters'); },
    };
    store.advancedBlocking = { getAdvancedBlocking: () => { calls.push('advancedBlocking'); } };
    store.userRules = { getUserRules: () => { calls.push('userRules'); } };
    store.settings = {
        confirmMode: ImportMode.full,
        onImportSuccess: () => { calls.push('onImportSuccess'); },
    };
    store.notification = { notify };

    const service = new SettingsCallbackServiceInternal();
    await service.OnImportStateChange(new ImportStatus({ success: true, filtersIds: [1, 2] }));

    assert.deepEqual(calls, ['filters', 'enabledFilters', 'advancedBlocking', 'userRules', 'onImportSuccess']);
    assert.equal(notifyCalls.length, 1);
    const props = notifyCalls[0].props as {
        type: NotificationsQueueType;
        iconType: NotificationsQueueIconType;
        notificationContext: NotificationContext;
    };
    assert.equal(props.type, NotificationsQueueType.success);
    assert.equal(props.iconType, NotificationsQueueIconType.done);
    assert.equal(props.notificationContext, NotificationContext.info);
});

test('OnImportStateChange success with partial mode shows a warning', async () => {
    __resetSettingsTestStore();
    const { notify, calls: notifyCalls } = makeNotifySpy();
    store.filters = { getFilters: () => {}, getEnabledFilters: () => {} };
    store.advancedBlocking = { getAdvancedBlocking: () => {} };
    store.userRules = { getUserRules: () => {} };
    store.settings = { confirmMode: ImportMode.withoutAnnoyance, onImportSuccess: () => {} };
    store.notification = { notify };

    const service = new SettingsCallbackServiceInternal();
    await service.OnImportStateChange(new ImportStatus({ success: true }));

    assert.equal(notifyCalls.length, 1);
    const props = notifyCalls[0].props as { type: NotificationsQueueType };
    assert.equal(props.type, NotificationsQueueType.warning);
});

test('OnImportStateChange requests consent when filters need confirmation', async () => {
    __resetSettingsTestStore();
    const { notify } = makeNotifySpy();
    store.filters = { getFilters: () => {}, getEnabledFilters: () => {} };
    store.advancedBlocking = { getAdvancedBlocking: () => {} };
    store.userRules = { getUserRules: () => {} };
    const consented: number[][] = [];
    store.settings = { setShouldGiveConsent: (ids: number[]) => { consented.push(ids); } };
    store.notification = { notify };

    const service = new SettingsCallbackServiceInternal();
    await service.OnImportStateChange(new ImportStatus({ success: false, filtersIds: [7, 8] }));

    assert.deepEqual(consented, [[7, 8]]);
});

test('OnImportStateChange failure notifies about the failed import', async () => {
    __resetSettingsTestStore();
    const { notify, calls: notifyCalls } = makeNotifySpy();
    store.filters = { getFilters: () => {}, getEnabledFilters: () => {} };
    store.advancedBlocking = { getAdvancedBlocking: () => {} };
    store.userRules = { getUserRules: () => {} };
    store.settings = {};
    store.notification = { notify };

    const service = new SettingsCallbackServiceInternal();
    await service.OnImportStateChange(new ImportStatus({ success: false, filtersIds: [] }));

    assert.equal(notifyCalls.length, 1);
    const props = notifyCalls[0].props as { message: string; type: NotificationsQueueType };
    assert.equal(props.message, 'settings import failed');
    assert.equal(props.type, NotificationsQueueType.warning);
});

test('OnHardwareAccelerationChange forwards to setIncomingHardwareAcceleration', async () => {
    __resetSettingsTestStore();
    const received: Array<boolean | undefined> = [];
    store.settings = { setIncomingHardwareAcceleration: (v: boolean | undefined) => { received.push(v); } };

    const service = new SettingsCallbackServiceInternal();
    await service.OnHardwareAccelerationChange(new BoolValue({ value: true }));

    assert.deepEqual(received, [true]);
});

test('OnApplicationVersionStatusResolved forwards to setNewVersionAvailable', async () => {
    __resetSettingsTestStore();
    const received: boolean[] = [];
    store.appInfo = { setNewVersionAvailable: (v: boolean) => { received.push(v); } };

    const service = new SettingsCallbackServiceInternal();
    await service.OnApplicationVersionStatusResolved(new BoolValue({ value: true }));

    assert.deepEqual(received, [true]);
});

test('OnWindowDidBecomeMain runs the light refresh sequence', async () => {
    __resetSettingsTestStore();
    const calls: string[] = [];
    store.settings = {
        getSafariExtensions: () => { calls.push('getSafariExtensions'); },
        getSettings: () => { calls.push('getSettings'); },
    };
    store.userRules = { getUserRules: () => { calls.push('userRules'); } };
    store.ui = { tryShowProblemLabel: () => { calls.push('tryShowProblemLabel'); } };

    const service = new SettingsCallbackServiceInternal();
    await service.OnWindowDidBecomeMain(new EmptyValue());

    assert.deepEqual(calls, [
        'getSafariExtensions',
        'getSettings',
        'userRules',
        'tryShowProblemLabel',
    ]);
});

test('OnSettingsPageRequested paywall opens the paywall', async () => {
    __resetSettingsTestStore();
    let paywallShown = 0;
    store.account = { showPaywall: () => { paywallShown++; }, closePaywall: () => {} };
    store.router = { changePath: () => {} };

    const service = new SettingsCallbackServiceInternal();
    await service.OnSettingsPageRequested(new StringValue({ value: 'paywall' }));

    assert.equal(paywallShown, 1);
});

test('OnSettingsPageRequested non-paywall closes paywall and navigates', async () => {
    __resetSettingsTestStore();
    let paywallClosed = 0;
    const navigated: string[] = [];
    store.account = { showPaywall: () => {}, closePaywall: () => { paywallClosed++; } };
    store.router = { changePath: (p: string) => { navigated.push(p); } };

    const service = new SettingsCallbackServiceInternal();
    await service.OnSettingsPageRequested(new StringValue({ value: 'license' }));

    assert.equal(paywallClosed, 1);
    assert.deepEqual(navigated, ['license']);
});

test('OnEffectiveThemeChanged forwards the theme via setEffectiveTheme', async () => {
    __resetSettingsTestStore();
    const received: unknown[] = [];
    store.settings = {
        setEffectiveTheme: (v: unknown) => { received.push(v); },
    };

    const service = new SettingsCallbackServiceInternal();
    await service.OnEffectiveThemeChanged(new EffectiveThemeValue({ value: EffectiveTheme.dark }));

    assert.deepEqual(received, [EffectiveTheme.dark]);
});

test('OnSettingsWindowOpened enables the Safari extensions screen', async () => {
    __resetSettingsTestStore();
    const received: boolean[] = [];
    store.ui = { setShowSafariExtensionsEnableScreen: (v: boolean) => { received.push(v); } };

    const service = new SettingsCallbackServiceInternal();
    await service.OnSettingsWindowOpened(new EmptyValue());

    assert.deepEqual(received, [true]);
});
