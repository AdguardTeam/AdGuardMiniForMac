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
const posted: Array<{ id: number; method: string; bytes: Uint8Array | string }> = [];
const mockWindow: Record<string, unknown> =
    (globalThis as Record<string, unknown>).window as Record<string, unknown> ?? {};
(globalThis as Record<string, unknown>).window = mockWindow;
mockWindow.webkit = {
    messageHandlers: {
        rpc: {
            postMessage: (msg: { id: number; method: string; bytes: Uint8Array | string }) => {
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

test('rpcCall posts the request payload base64-encoded (plist-compatible body)', async () => {
    __resetForTests();
    const payload = new Uint8Array([0x08, 0x01, 0x00, 0xFF, 0x7F]);
    const promise = rpcCall('UserRulesService.ImportUserRules', payload);
    const postedMsg = posted[posted.length - 1];
    assert.equal(typeof postedMsg.bytes, 'string',
                 'bytes MUST be a base64 string, not a raw Uint8Array');
    // `atob` of the posted base64 must round-trip the original payload.
    const binary = atob(postedMsg.bytes as string);
    const roundTripped = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    assert.deepEqual(Array.from(roundTripped), Array.from(payload));
    // Clean up the pending entry so the test runner is not left with a timer.
    __installResolveRpc()(postedMsg.id, '');
    await promise;
});

test('malformed base64 reply rejects the pending RPC (does not hang)', async () => {
    __resetForTests();
    const promise = rpcCall('ThemeService.GetEffectiveTheme', new Uint8Array([0]));
    const id = posted[posted.length - 1].id;
    // `atob` throws on this input; the resolver must reject, not leave the
    // promise pending forever with its timeout already cleared.
    __installResolveRpc()(id, '!!!not-base64!!!');
    await assert.rejects(
        promise,
        (err: Error) => err.message.includes('base64ToBytes: invalid base64 payload')
                    && err.name === 'RpcError',
    );
});

test('window.__rejectRpc rejects the pending RPC with the native-side message', async () => {
    __resetForTests();
    const promise = rpcCall('UnknownService.UnknownMethod', new Uint8Array([0]));
    const id = posted[posted.length - 1].id;
    __installResolveRpc();
    (window as unknown as { __rejectRpc?: (id: number, message: string, reason?: string) => void })
        .__rejectRpc?.(id, 'UnknownService.UnknownMethod', 'no-service');
    await assert.rejects(
        promise,
        (err: Error) => err.message.includes('UnknownService.UnknownMethod')
            && err.name === 'RpcError'
            && (err as { reason?: string }).reason === 'no-service',
    );
});

test('window.__rejectRpc carries the native-side reason code on the error', async () => {
    __resetForTests();
    const promise = rpcCall('UserRulesService.ImportUserRules', new Uint8Array([0]));
    const id = posted[posted.length - 1].id;
    __installResolveRpc();
    // A native-side rejection must surface the reason so the page can tell a
    // user-facing situation (e.g. an oversized payload) from a programming
    // error (e.g. an undeclared method).
    (window as unknown as { __rejectRpc?: (id: number, message: string, reason?: string) => void })
        .__rejectRpc?.(id, 'UserRulesService.ImportUserRules', 'oversized');
    await assert.rejects(
        promise,
        // The reason is carried both structured and in the message text:
        // telemetry and the unified log ship `err.message`, and call sites
        // rarely catch to read the `reason` field.
        (err: Error) => err.name === 'RpcError'
            && (err as { reason?: string }).reason === 'oversized'
            && err.message.includes('(oversized)'),
    );
});

test('window.__rejectRpc with an unknown id is a no-op', async () => {
    __resetForTests();
    const resolve = __installResolveRpc();
    assert.doesNotThrow(() => {
        resolve(999_999, '!!!not-base64!!!');
        (window as unknown as { __rejectRpc?: (id: number, message: string, reason?: string) => void })
            .__rejectRpc?.(999_999, 'GhostService.Method', 'no-service');
    });
});

test('a postMessage throw breaks the timeout streak (immediate local failure)', async (t) => {
    t.mock.timers.enable();
    __resetForTests();
    let surfaceInvocations = 0;
    __installRpcTimeoutAlertSurface(() => { surfaceInvocations += 1; });

    // One timeout: counter reaches 1.
    const p0 = rpcCall('A', new Uint8Array([0]));
    t.mock.timers.tick(600_001);
    await assert.rejects(p0, (err: Error) => err.message.includes('A'));

    // A synchronous postMessage throw is an immediate local failure, not a
    // timeout: it must reset the streak so two later timeouts do not fire
    // the alert surface.
    const rpcMock = (mockWindow.webkit as {
        messageHandlers: { rpc: { postMessage: (msg: { id: number; method: string; bytes: Uint8Array | string }) => void } };
    }).messageHandlers.rpc;
    const originalPostMessage = rpcMock.postMessage;
    rpcMock.postMessage = () => { throw new Error('boom'); };
    const p1 = rpcCall('B', new Uint8Array([0]));
    await assert.rejects(p1, (err: Error) => err.message.includes('boom'));
    rpcMock.postMessage = originalPostMessage;

    const p2 = rpcCall('C', new Uint8Array([2]));
    const p3 = rpcCall('D', new Uint8Array([3]));
    t.mock.timers.tick(600_001);
    await assert.rejects(p2, (err: Error) => err.message.includes('C'));
    await assert.rejects(p3, (err: Error) => err.message.includes('D'));
    assert.equal(surfaceInvocations, 0,
                 'an immediate postMessage failure must break the timeout streak');
});

test('bytesToBase64 round-trips payloads spanning multiple chunks', async () => {
    __resetForTests();
    // 32766-byte chunks: 100_000 bytes span 4 chunks and exercise the
    // padding-free concatenation of `btoa` outputs.
    const payload = new Uint8Array(100_000);
    for (let i = 0; i < payload.length; i += 1) {
        payload[i] = i % 256;
    }
    const promise = rpcCall('UserRulesService.ImportUserRules', payload);
    const id = posted[posted.length - 1].id;
    const binary = atob(posted[posted.length - 1].bytes as string);
    const roundTripped = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    assert.deepEqual(Array.from(roundTripped), Array.from(payload));
    __installResolveRpc()(id, '');
    await promise;
});
