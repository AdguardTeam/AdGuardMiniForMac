// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { OnboardingCallbackService } from '../../modules/common/apis/callbacks/OnboardingCallbackService';
import { __resetForTests } from '../../modules/common/apis/callbackDispatch';
import { setupOnboardingWebViewBridge } from '../../modules/onboarding/lib/webViewOnboardingBootstrap';

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

const ONBOARDING_METHODS = [
    'OnEffectiveThemeChanged',
] as const;

/** Minimal stub recording the 1 method call (avoids log/store deps). */
const makeStubService = () => {
    const calls: Array<{ method: string; buffer: ArrayBuffer }> = [];
    const stub: Record<string, (buffer: ArrayBuffer) => Promise<unknown>> = {};
    for (const m of ONBOARDING_METHODS) {
        stub[m] = async (buffer: ArrayBuffer) => { calls.push({ method: m, buffer }); };
    }
    return { stub: stub as unknown as OnboardingCallbackService, calls };
};

test('routes OpenLinkInBrowser to the Swift NSWorkspace bridge', () => {
    const { w, posted } = setupFakeWindow();
    __resetForTests();
    setupOnboardingWebViewBridge(makeStubService().stub);
    (w as unknown as { OpenLinkInBrowser: (url: string) => void }).OpenLinkInBrowser('https://adguard.com');
    assert.deepEqual(posted, [{ name: 'openLinkInBrowser', body: 'https://adguard.com' }]);
});

test('routes SystemClipboard.write to the Swift NSPasteboard bridge', () => {
    const { w, posted } = setupFakeWindow();
    __resetForTests();
    setupOnboardingWebViewBridge(makeStubService().stub);
    (w as unknown as { SystemClipboard: { write: (t: string) => void } }).SystemClipboard.write('LICENSE-KEY-1234');
    assert.deepEqual(posted, [{ name: 'systemClipboard', body: 'LICENSE-KEY-1234' }]);
});

test('routes SystemClipboard.writeText to the Swift NSPasteboard bridge', () => {
    const { w, posted } = setupFakeWindow();
    __resetForTests();
    setupOnboardingWebViewBridge(makeStubService().stub);
    (w as unknown as { SystemClipboard: { writeText: (t: string) => void } }).SystemClipboard.writeText('LICENSE-KEY-1234');
    assert.deepEqual(posted, [{ name: 'systemClipboard', body: 'LICENSE-KEY-1234' }]);
});

test('registers the 1 OnboardingCallbackService handler', async () => {
    const { w } = setupFakeWindow();
    __resetForTests();
    const { stub, calls } = makeStubService();
    setupOnboardingWebViewBridge(stub);

    const dispatch = (w as unknown as {
        __dispatchCallback: (method: string, bytes: string) => Promise<void>;
    }).__dispatchCallback;

    for (const method of ONBOARDING_METHODS) {
        // Base64 of a single zero byte — the stub ignores payload content.
        await dispatch(`OnboardingCallbackService.${method}`, 'AA==');
    }

    assert.equal(calls.length, 1);
    assert.deepEqual(
        calls.map((c) => c.method).sort(),
        [...ONBOARDING_METHODS].sort(),
    );
});
