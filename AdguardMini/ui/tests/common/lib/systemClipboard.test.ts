// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';

import {
    installSystemClipboardBridge,
    __resetSystemClipboardBridgeForTests,
} from '../../../modules/common/lib/systemClipboard';

const posted: Array<{ id: number }> = [];
const mockWindow: Record<string, unknown> = {};

mockWindow.webkit = { messageHandlers: {} };

const handlers = (mockWindow.webkit as {
    messageHandlers: Record<string, { postMessage(msg: unknown): void }>;
}).messageHandlers;

(globalThis as Record<string, unknown>).window = mockWindow;

beforeEach(() => {
    __resetSystemClipboardBridgeForTests();
    posted.length = 0;
    // Re-install handlers each test: the "without the Swift handler" case
    // deletes `systemClipboardRead`, which must not leak into later tests.
    handlers.systemClipboard = { postMessage: () => {} };
    handlers.systemClipboardRead = {
        postMessage: (msg: unknown) => { posted.push(msg as { id: number }); },
    };
});

test('read() posts a correlated id and resolves with the native reply', async () => {
    const bridge = installSystemClipboardBridge();
    const promise = bridge.read();

    assert.equal(posted.length, 1);
    const id = posted[0].id;
    assert.equal(typeof id, 'number');

    const resolve = mockWindow.__resolveSystemClipboardRead as (rid: number, text: string) => void;
    resolve(id, '||example.com^\n||tracker.org^');

    const text = await promise;
    assert.equal(text, '||example.com^\n||tracker.org^');
});

test('read() ignores replies with a non-matching id', async () => {
    const bridge = installSystemClipboardBridge();
    const promise = bridge.read();
    const id = posted[0].id;
    const resolve = mockWindow.__resolveSystemClipboardRead as (rid: number, text: string) => void;
    resolve(id + 1, 'wrong');
    resolve(id, 'right');
    const text = await promise;
    assert.equal(text, 'right');
});

test('read() resolves empty when Swift never replies', async (t) => {
    t.mock.timers.enable();
    const bridge = installSystemClipboardBridge();
    const promise = bridge.read();
    t.mock.timers.tick(5001);
    const text = await promise;
    assert.equal(text, '');
});

test('read() without the Swift handler falls back safely without posting', async () => {
    delete handlers.systemClipboardRead;
    const bridge = installSystemClipboardBridge();
    // `navigator.clipboard` is absent in the node test runner → empty read.
    const text = await bridge.read();
    assert.equal(text, '');
    assert.equal(posted.length, 0);
});
