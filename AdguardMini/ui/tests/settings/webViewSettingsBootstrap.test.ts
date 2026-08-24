// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AccountCallbackService } from '../../modules/common/apis/callbacks/AccountCallbackService';
import type { FiltersCallbackService } from '../../modules/common/apis/callbacks/FiltersCallbackService';
import type { SettingsCallbackService } from '../../modules/common/apis/callbacks/SettingsCallbackService';
import type { UserRulesCallbackService } from '../../modules/common/apis/callbacks/UserRulesCallbackService';
import { __resetForTests } from '../../modules/common/apis/callbackDispatch';
import { setupSettingsWebViewBridge } from '../../modules/settings/lib/webViewSettingsBootstrap';

const setupFakeWindow = () => {
    const w: Record<string, unknown> = {
        addEventListener: () => {},
        dispatchEvent: () => true,
    };
    (globalThis as Record<string, unknown>).window = w;
    (globalThis as Record<string, unknown>).document = {
        addEventListener: () => {},
    } as unknown as Document;
    const posted: Array<{ name: string; body: unknown }> = [];
    w.webkit = {
        messageHandlers: {
            openLinkInBrowser: {
                postMessage: (url: string) => { posted.push({ name: 'openLinkInBrowser', body: url }); },
            },
            systemClipboard: {
                postMessage: (text: string) => { posted.push({ name: 'systemClipboard', body: text }); },
            },
        },
    };
    return { w, posted };
};

const SETTINGS_METHODS = [
    'OnSafariExtensionUpdate',
    'OnLoginItemStateChange',
    'OnImportStateChange',
    'OnHardwareAccelerationChange',
    'OnApplicationVersionStatusResolved',
    'OnWindowDidBecomeMain',
    'OnSettingsPageRequested',
    'OnEffectiveThemeChanged',
    'OnSettingsWindowOpened',
    'OnURLFilterStateChanged',
] as const;

/** Minimal stub recording the 10 method calls (avoids log/store deps). */
const makeStubService = () => {
    const calls: Array<{ method: string; buffer: ArrayBuffer }> = [];
    const stub: Record<string, (buffer: ArrayBuffer) => Promise<unknown>> = {};
    for (const m of SETTINGS_METHODS) {
        stub[m] = async (buffer: ArrayBuffer) => { calls.push({ method: m, buffer }); };
    }
    return { stub: stub as unknown as SettingsCallbackService, calls };
};

/** Minimal stub for the 2 user-rules callback methods. */
const makeUserRulesStubService = () => {
    const calls: Array<{ method: string; buffer: ArrayBuffer }> = [];
    const stub: Record<string, (buffer: ArrayBuffer) => Promise<unknown>> = {
        onUserFilterChange: async (buffer: ArrayBuffer) => { calls.push({ method: 'onUserFilterChange', buffer }); },
        onUserRulesWindowClosed: async (buffer: ArrayBuffer) => { calls.push({ method: 'onUserRulesWindowClosed', buffer }); },
    };
    return { stub: stub as unknown as UserRulesCallbackService, calls };
};

/** Minimal stub recording the 1 account callback method. */
const makeAccountStubService = () => {
    const calls: Array<{ method: string; buffer: ArrayBuffer }> = [];
    const stub: Record<string, (buffer: ArrayBuffer) => Promise<unknown>> = {
        OnLicenseUpdate: async (buffer: ArrayBuffer) => { calls.push({ method: 'OnLicenseUpdate', buffer }); },
    };
    return { stub: stub as unknown as AccountCallbackService, calls };
};

/** Minimal stub recording the 3 filters callback methods. */
const makeFiltersStubService = () => {
    const calls: Array<{ method: string; buffer: ArrayBuffer }> = [];
    const stub: Record<string, (buffer: ArrayBuffer) => Promise<unknown>> = {
        OnFiltersUpdate: async (buffer: ArrayBuffer) => { calls.push({ method: 'OnFiltersUpdate', buffer }); },
        OnFiltersIndexUpdate: async (buffer: ArrayBuffer) => { calls.push({ method: 'OnFiltersIndexUpdate', buffer }); },
        OnCustomFiltersSubscribe: async (buffer: ArrayBuffer) => { calls.push({ method: 'OnCustomFiltersSubscribe', buffer }); },
    };
    return { stub: stub as unknown as FiltersCallbackService, calls };
};

const setupBridge = () => setupSettingsWebViewBridge(
    makeStubService().stub,
    makeUserRulesStubService().stub,
    makeAccountStubService().stub,
    makeFiltersStubService().stub,
);

test('routes OpenLinkInBrowser to the Swift NSWorkspace bridge', () => {
    const { w, posted } = setupFakeWindow();
    __resetForTests();
    setupBridge();
    (w as unknown as { OpenLinkInBrowser: (url: string) => void }).OpenLinkInBrowser('https://adguard.com');
    assert.deepEqual(posted, [{ name: 'openLinkInBrowser', body: 'https://adguard.com' }]);
});

test('routes SystemClipboard.write to the Swift NSPasteboard bridge', () => {
    const { w, posted } = setupFakeWindow();
    __resetForTests();
    setupBridge();
    (w as unknown as { SystemClipboard: { write: (t: string) => void } }).SystemClipboard.write('LICENSE-KEY-1234');
    assert.deepEqual(posted, [{ name: 'systemClipboard', body: 'LICENSE-KEY-1234' }]);
});

test('routes SystemClipboard.writeText to the Swift NSPasteboard bridge', () => {
    const { w, posted } = setupFakeWindow();
    __resetForTests();
    setupBridge();
    (w as unknown as { SystemClipboard: { writeText: (t: string) => void } }).SystemClipboard.writeText('LICENSE-KEY-1234');
    assert.deepEqual(posted, [{ name: 'systemClipboard', body: 'LICENSE-KEY-1234' }]);
});

test('registers all 10 SettingsCallbackService handlers', async () => {
    const { w } = setupFakeWindow();
    __resetForTests();
    const { stub, calls } = makeStubService();
    setupSettingsWebViewBridge(
        stub,
        makeUserRulesStubService().stub,
        makeAccountStubService().stub,
        makeFiltersStubService().stub,
    );

    const dispatch = (w as unknown as {
        __dispatchCallback: (method: string, bytes: string) => Promise<void>;
    }).__dispatchCallback;

    for (const method of SETTINGS_METHODS) {
        // Base64 of a single zero byte — the stub ignores payload content.
        await dispatch(`SettingsCallbackService.${method}`, 'AA==');
    }

    assert.equal(calls.length, 10);
    assert.deepEqual(
        calls.map((c) => c.method).sort(),
        [...SETTINGS_METHODS].sort(),
    );
});

test('registers the 2 UserRulesCallbackService handlers', async () => {
    const { w } = setupFakeWindow();
    __resetForTests();
    const { stub, calls } = makeUserRulesStubService();
    setupSettingsWebViewBridge(
        makeStubService().stub,
        stub,
        makeAccountStubService().stub,
        makeFiltersStubService().stub,
    );

    const dispatch = (w as unknown as {
        __dispatchCallback: (method: string, bytes: string) => Promise<void>;
    }).__dispatchCallback;

    // Base64 of a single zero byte — the stub ignores payload content.
    await dispatch('UserRulesCallbackService.onUserFilterChange', 'AA==');
    await dispatch('UserRulesCallbackService.onUserRulesWindowClosed', 'AA==');

    assert.equal(calls.length, 2);
    assert.deepEqual(
        calls.map((c) => c.method).sort(),
        ['onUserFilterChange', 'onUserRulesWindowClosed'],
    );
});

test('registers the 1 AccountCallbackService handler', async () => {
    const { w } = setupFakeWindow();
    __resetForTests();
    const { stub, calls } = makeAccountStubService();
    setupSettingsWebViewBridge(
        makeStubService().stub,
        makeUserRulesStubService().stub,
        stub,
        makeFiltersStubService().stub,
    );

    const dispatch = (w as unknown as {
        __dispatchCallback: (method: string, bytes: string) => Promise<void>;
    }).__dispatchCallback;

    // Base64 of a single zero byte — the stub ignores payload content.
    await dispatch('AccountCallbackService.OnLicenseUpdate', 'AA==');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'OnLicenseUpdate');
});

test('registers the 3 FiltersCallbackService handlers', async () => {
    const { w } = setupFakeWindow();
    __resetForTests();
    const { stub, calls } = makeFiltersStubService();
    setupSettingsWebViewBridge(
        makeStubService().stub,
        makeUserRulesStubService().stub,
        makeAccountStubService().stub,
        stub,
    );

    const dispatch = (w as unknown as {
        __dispatchCallback: (method: string, bytes: string) => Promise<void>;
    }).__dispatchCallback;

    for (const method of ['OnFiltersUpdate', 'OnFiltersIndexUpdate', 'OnCustomFiltersSubscribe']) {
        // Base64 of a single zero byte — the stub ignores payload content.
        await dispatch(`FiltersCallbackService.${method}`, 'AA==');
    }

    assert.equal(calls.length, 3);
    assert.deepEqual(
        calls.map((c) => c.method).sort(),
        ['OnCustomFiltersSubscribe', 'OnFiltersIndexUpdate', 'OnFiltersUpdate'],
    );
});
