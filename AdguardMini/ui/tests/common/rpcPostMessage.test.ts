// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    rpcCall,
    __resetForTests,
    __installResolveRpc,
    __installRpcTimeoutAlertSurface,
} from '../../modules/common/apis/rpcPostMessage';

// Mock window.webkit.messageHandlers.rpc.postMessage
// NOTE: the source reads `window.webkit.messageHandlers.rpc` (not
// `globalThis.webkit`), so the mock MUST install `webkit` ON `window`
// (not on `globalThis` directly). This deviates from the plan's verbatim
// test code to match the source's actual lookup path.
const posted: Array<{ id: number; method: string; bytes: Uint8Array }> = [];
const mockWindow: Record<string, unknown> =
    (globalThis as Record<string, unknown>).window as Record<string, unknown> ?? {};
(globalThis as Record<string, unknown>).window = mockWindow;
mockWindow.webkit = {
    messageHandlers: {
        rpc: {
            postMessage: (msg: { id: number; method: string; bytes: Uint8Array }) => {
                posted.push(msg);
            },
        },
    },
};

/**
 * Encode bytes as base64 the way the native side does
 * (`Data.base64EncodedString()`), mirroring the real Swift→TS boundary.
 */
const toBase64 = (bytes: number[]): string => btoa(String.fromCharCode(...bytes));

test('rpcCall resolves when Swift calls window.__resolveRpc with matching id', async () => {
    __resetForTests();
    const promise = rpcCall('ThemeService.GetEffectiveTheme', new Uint8Array([0]));
    const id = posted[posted.length - 1].id;
    // Swift replies with EffectiveThemeValue{value=dark} → 0x08 0x01, sent as base64.
    __installResolveRpc()(id, toBase64([0x08, 0x01]));
    const result = await promise;
    assert.deepEqual(Array.from(result), [0x08, 0x01]);
});

test('rpcCall rejects with timeout error naming the method after 10 minutes', async (t) => {
    t.mock.timers.enable();
    __resetForTests();
    const promise = rpcCall('ThemeService.GetEffectiveTheme', new Uint8Array([0]));
    // Advance so the timer actually fires before the test exits.
    t.mock.timers.tick(600_001);
    // The source's error message is "RPC \"<methodName>\" timed out after 600000 ms".
    // Validation accepts either the literal word "timeout" or the natural phrasing
    // "timed out" (the source currently emits the latter; the spec requires only that
    // the error be a timeout error naming the method).
    await assert.rejects(
        promise,
        (err: Error) => err.message.includes('ThemeService.GetEffectiveTheme')
                    && (err.message.toLowerCase().includes('timeout')
                        || err.message.toLowerCase().includes('timed out')),
    );
});

test('concurrent rpcCall invocations return their own reply (no cross-talk)', async () => {
    __resetForTests();
    const p0 = rpcCall('A', new Uint8Array([0]));
    const p1 = rpcCall('B', new Uint8Array([1]));
    const id0 = posted[posted.length - 2].id;
    const id1 = posted[posted.length - 1].id;
    const resolve = __installResolveRpc();
    resolve(id1, toBase64([0xff]));
    resolve(id0, toBase64([0x00]));
    const [r0, r1] = await Promise.all([p0, p1]);
    assert.deepEqual(Array.from(r0), [0x00]);
    assert.deepEqual(Array.from(r1), [0xff]);
});

test('rpcCall: 3 consecutive timeouts invoke the alert surface once', async (t) => {
    t.mock.timers.enable();
    __resetForTests();
    let surfaceInvocations = 0;
    __installRpcTimeoutAlertSurface(() => { surfaceInvocations += 1; });

    const p0 = rpcCall('A', new Uint8Array([0]));
    const p1 = rpcCall('B', new Uint8Array([1]));
    const p2 = rpcCall('C', new Uint8Array([2]));
    t.mock.timers.tick(600_001);
    await assert.rejects(p0, (err: Error) => err.message.includes('A'));
    await assert.rejects(p1, (err: Error) => err.message.includes('B'));
    await assert.rejects(p2, (err: Error) => err.message.includes('C'));
    assert.equal(surfaceInvocations, 1, 'surface invoked exactly once when count crosses threshold');
});

test('rpcCall: 2 consecutive timeouts do NOT invoke the alert surface', async (t) => {
    t.mock.timers.enable();
    __resetForTests();
    let surfaceInvocations = 0;
    __installRpcTimeoutAlertSurface(() => { surfaceInvocations += 1; });

    const p0 = rpcCall('A', new Uint8Array([0]));
    const p1 = rpcCall('B', new Uint8Array([1]));
    t.mock.timers.tick(600_001);
    await assert.rejects(p0, (err: Error) => err.message.includes('A'));
    await assert.rejects(p1, (err: Error) => err.message.includes('B'));
    assert.equal(surfaceInvocations, 0, 'surface NOT invoked below threshold');
});

test('rpcCall: success after 2 timeouts resets the counter; 3 more timeouts re-invoke surface', async (t) => {
    t.mock.timers.enable();
    __resetForTests();
    let surfaceInvocations = 0;
    __installRpcTimeoutAlertSurface(() => { surfaceInvocations += 1; });

    const p0 = rpcCall('A', new Uint8Array([0]));
    const p1 = rpcCall('B', new Uint8Array([1]));
    t.mock.timers.tick(600_001);
    await assert.rejects(p0, (err: Error) => err.message.includes('A'));
    await assert.rejects(p1, (err: Error) => err.message.includes('B'));
    assert.equal(surfaceInvocations, 0, 'pre-reset: below threshold');

    // Resolve one call BEFORE it times out — this triggers the
    // resolve path which resets consecutiveTimeoutCount to 0.
    const pReset = rpcCall('C', new Uint8Array([2]));
    const idReset = posted[posted.length - 1].id;
    __installResolveRpc()(idReset, toBase64([0x00]));
    await pReset;

    // 3 more timeouts — counter resets and re-surfaces on the 3rd.
    const q0 = rpcCall('D', new Uint8Array([3]));
    const q1 = rpcCall('E', new Uint8Array([4]));
    const q2 = rpcCall('F', new Uint8Array([5]));
    t.mock.timers.tick(600_001);
    await assert.rejects(q0, (err: Error) => err.message.includes('D'));
    await assert.rejects(q1, (err: Error) => err.message.includes('E'));
    await assert.rejects(q2, (err: Error) => err.message.includes('F'));
    assert.equal(surfaceInvocations, 1, 'post-reset: surface invoked exactly once on the 3rd');
});
