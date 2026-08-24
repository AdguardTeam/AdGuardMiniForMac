// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    installCallbackDispatch,
    registerCallbackHandler,
    __resetForTests,
} from '../../modules/common/apis/callbackDispatch';

const setupFakeWindow = () => {
    const w: Record<string, unknown> = {
        addEventListener: () => {},
        dispatchEvent: () => true,
    };
    (globalThis as Record<string, unknown>).window = w;
    return w;
};

/**
 * Encode bytes as base64 the way the native side does
 * (`Data.base64EncodedString()`), mirroring the real Swift→TS boundary.
 */
const toBase64 = (bytes: number[]): string => btoa(String.fromCharCode(...bytes));

test('routes by FQN to the registered handler', async () => {
    setupFakeWindow();
    __resetForTests();
    installCallbackDispatch();

    let receivedBytes: Uint8Array | null = null;
    registerCallbackHandler(
        'OnboardingCallbackService.OnEffectiveThemeChanged',
        async (bytes) => { receivedBytes = bytes; },
    );

    const dispatch = (window as unknown as {
        __dispatchCallback: (method: string, bytes: string) => Promise<void>;
    }).__dispatchCallback;

    await dispatch(
        'OnboardingCallbackService.OnEffectiveThemeChanged',
        toBase64([0x08, 0x01]),
    );

    assert.deepEqual(Array.from(receivedBytes ?? []), [0x08, 0x01]);
});

test('logs and drops unknown method names', async () => {
    setupFakeWindow();
    __resetForTests();
    const errors: string[] = [];
    (globalThis as Record<string, unknown>).console = {
        ...console,
        error: (m: string) => errors.push(m),
    };
    installCallbackDispatch();

    const dispatch = (window as unknown as {
        __dispatchCallback: (method: string, bytes: string) => Promise<void>;
    }).__dispatchCallback;

    await dispatch('Unknown.Method', toBase64([0]));

    assert.ok(errors.some((m) => m.includes('Unknown.Method')));
});

test('logs and drops payload deserialisation failures without rejecting', async () => {
    setupFakeWindow();
    __resetForTests();
    let threw = false;
    installCallbackDispatch();
    registerCallbackHandler('Bad.Handler', async () => {
        throw new Error('deserialise failed');
    });

    const dispatch = (window as unknown as {
        __dispatchCallback: (method: string, bytes: string) => Promise<void>;
    }).__dispatchCallback;

    try {
        await dispatch('Bad.Handler', toBase64([0xff]));
    } catch {
        threw = true;
    }
    assert.equal(threw, false);
});

test('in-order delivery: pushes are applied in the order dispatched', async () => {
    setupFakeWindow();
    __resetForTests();
    installCallbackDispatch();

    const order: number[] = [];
    registerCallbackHandler('Seq.A', async () => { order.push(1); });
    registerCallbackHandler('Seq.B', async () => { order.push(2); });

    const dispatch = (window as unknown as {
        __dispatchCallback: (method: string, bytes: string) => Promise<void>;
    }).__dispatchCallback;

    await dispatch('Seq.A', toBase64([0]));
    await dispatch('Seq.B', toBase64([0]));

    assert.deepEqual(order, [1, 2]);
});
