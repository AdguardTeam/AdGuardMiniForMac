// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { xcall } from '../../modules/common/apis/apiWindow';

let webkitCalls = 0;
let sciterCalls = 0;

const reset = () => {
    webkitCalls = 0;
    sciterCalls = 0;
    const g = globalThis as Record<string, unknown>;
    delete g.webkit;
    delete g.__resolveRpc;
    const w = (g as { window?: Record<string, unknown> }).window ?? {};
    delete w.__resolveRpc;
    delete w.webkit;
    (g as { window?: Record<string, unknown> }).window = w;
};

test('xcall routes via rpcPostMessage when window.webkit.messageHandlers.rpc is present', async () => {
    reset();
    (globalThis as Record<string, unknown>).window =
        (globalThis as Record<string, unknown>).window ?? {};
    const mockWindow = (globalThis as Record<string, unknown>).window as Record<string, unknown>;
    // NOTE: the source reads `window.webkit.messageHandlers.rpc` (not
    // `globalThis.webkit`) — the mock must install `webkit` on `window`.
    mockWindow.webkit = {
        messageHandlers: { rpc: { postMessage: () => { webkitCalls++; } } },
    };

    const { __installResolveRpc } = await import(
        '../../modules/common/apis/rpcPostMessage'
    );
    const resolve = __installResolveRpc();
    const p = xcall('ThemeService.GetEffectiveTheme', new ArrayBuffer(1));
    // Swift sends the reply base64-encoded; base64 of 0x08 0x01 is "CAE=".
    resolve(1, 'CAE=');
    await p;
    assert.equal(webkitCalls, 1);
    assert.equal(sciterCalls, 0);
});
