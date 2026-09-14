// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { withLast } from 'Utils/queue';

/**
 * Wait for `ms` milliseconds; also flushes all pending microtasks.
 */
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

(globalThis as Record<string, unknown>).log = {
    dbg: () => {},
    info: () => {},
    error: () => {},
};

test('without delay dispatches immediately and preserves order', async () => {
    const calls: string[] = [];
    const enqueue = withLast<string, void>(async (data) => { calls.push(data); }, 'test');

    await enqueue('a');
    await enqueue('b');
    assert.deepEqual(calls, ['a', 'b']);
});

test('without delay drops intermediate calls while a call is in flight', async () => {
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const enqueue = withLast<string, void>(async (data) => {
        calls.push(data);
        await gate;
    }, 'test');

    const first = enqueue('a');
    enqueue('b');
    enqueue('c');
    enqueue('d');
    release();
    await first;
    await sleep(0);
    assert.deepEqual(calls, ['a', 'b', 'd']);
});

test('with delay does not run the action before the delay elapses', async () => {
    const calls: string[] = [];
    const enqueue = withLast<string, void>(async (data) => { calls.push(data); }, 'test', 30);

    enqueue('a');
    enqueue('b');
    enqueue('c');
    assert.deepEqual(calls, []);
    await sleep(60);
    assert.deepEqual(calls, ['c']);
});

test('with delay resolves immediately without waiting for the action', async () => {
    let ran = false;
    const enqueue = withLast<string, void>(async () => { ran = true; }, 'test', 30);

    await enqueue('a');
    assert.equal(ran, false);
    await sleep(60);
    assert.equal(ran, true);
});

test('with delay waits for inactivity after an in-flight call completes', async () => {
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const enqueue = withLast<string, void>(async (data) => {
        calls.push(data);
        await gate;
    }, 'test', 30);

    enqueue('a');
    await sleep(40);
    assert.deepEqual(calls, ['a']);
    enqueue('b');
    release();
    await sleep(10);
    assert.deepEqual(calls, ['a']);
    await sleep(60);
    assert.deepEqual(calls, ['a', 'b']);
});

test('with delay replaces a pending call during the debounce window', async () => {
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const enqueue = withLast<string, void>(async (data) => {
        calls.push(data);
        await gate;
    }, 'test', 30);

    enqueue('a');
    await sleep(40);
    assert.deepEqual(calls, ['a']);
    enqueue('b');
    release();
    await sleep(10);
    enqueue('c');
    await sleep(60);
    assert.deepEqual(calls, ['a', 'c']);
});

test('with delay drops intermediate calls while a call is in flight', async () => {
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const enqueue = withLast<string, void>(async (data) => {
        calls.push(data);
        await gate;
    }, 'test', 30);

    enqueue('a');
    await sleep(40);
    assert.deepEqual(calls, ['a']);
    enqueue('b');
    enqueue('c');
    enqueue('d');
    release();
    await sleep(70);
    assert.deepEqual(calls, ['a', 'd']);
});

test('an empty call while idle does not block subsequent calls', async () => {
    const calls: string[] = [];
    const enqueue = withLast<string, void>(async (data) => { calls.push(data); }, 'test');

    await enqueue();
    await enqueue('a');
    assert.deepEqual(calls, ['a']);
});
