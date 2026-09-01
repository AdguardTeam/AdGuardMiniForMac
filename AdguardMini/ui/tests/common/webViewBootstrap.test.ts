// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    webViewBootstrap,
} from '../../modules/common/webViewBootstrap';
import {
    __getRpcTimeoutAlertSurface,
    __resetForTests,
} from '../../modules/common/apis/rpcPostMessage';

const setupFakeWindow = () => {
    const w: Record<string, unknown> = {
        addEventListener: () => {},
        dispatchEvent: () => true,
    };
    const listeners: Record<string, Array<(evt: unknown) => void>> = {};
    (globalThis as Record<string, unknown>).window = w;
    (globalThis as Record<string, unknown>).document = {
        addEventListener: (type: string, fn: (evt: unknown) => void) => {
            (listeners[type] ??= []).push(fn);
        },
    } as unknown as Document;
    return { w, listeners };
};

test('installs all in-use globals', () => {
    const { w } = setupFakeWindow();
    webViewBootstrap({ env: { launch: () => {} } });
    assert.equal(typeof w.OpenLinkInBrowser, 'function');
    assert.equal(typeof w.log, 'object');
    assert.equal(typeof w.setUnhandledExceptionHandler, 'function');
});

test('default launch routes OpenLinkInBrowser through the Swift bridge', () => {
    const posted: Array<{ name: string; body: unknown }> = [];
    const w: Record<string, unknown> = {
        webkit: {
            messageHandlers: {
                openLinkInBrowser: {
                    postMessage: (url: string) => { posted.push({ name: 'openLinkInBrowser', body: url }); },
                },
            },
        },
        addEventListener: () => {},
        dispatchEvent: () => true,
    };
    (globalThis as Record<string, unknown>).window = w;
    (globalThis as Record<string, unknown>).document = {
        addEventListener: () => {},
    } as unknown as Document;

    webViewBootstrap();

    (w as unknown as { OpenLinkInBrowser: (url: string) => void }).OpenLinkInBrowser('https://adguard.com');
    assert.deepEqual(posted, [{ name: 'openLinkInBrowser', body: 'https://adguard.com' }]);
});

test('does NOT install any unused Sciter globals', () => {
    const { w } = setupFakeWindow();
    webViewBootstrap({ env: { launch: () => {} } });
    assert.equal(w.FS, undefined);
    assert.equal(w.splitPath, undefined);
    assert.equal(w.ApplicationsPath, undefined);
    assert.equal(w.decode, undefined);
    assert.equal(w.selectFile, undefined);
    assert.equal(w.SciterWindow, undefined);
    assert.equal(w.DocumentsPath, undefined);
});

test('installs a link-click delegation handler via standard addEventListener', () => {
    const { listeners } = setupFakeWindow();
    webViewBootstrap({ env: { launch: () => {} } });
    // At least one click listener is the link-click delegation handler.
    assert.ok((listeners.click?.length ?? 0) >= 1);
});

test('suppresses the native context menu only outside editable fields', () => {
    const { listeners } = setupFakeWindow();
    webViewBootstrap({ env: { launch: () => {} } });
    const handlers = listeners.contextmenu ?? [];
    assert.ok(handlers.length >= 1, 'must install a contextmenu listener');

    // In non-editable areas the native menu (Reload) must be suppressed.
    let prevented = false;
    handlers[0]({
        target: { closest: () => null },
        preventDefault: () => { prevented = true; },
    });
    assert.equal(prevented, true, 'must suppress the native menu outside editable fields');

    // Inside editable fields (input/textarea/contenteditable) the native
    // copy/paste menu must remain available.
    prevented = false;
    handlers[0]({
        target: { closest: () => ({ editable: true }) },
        preventDefault: () => { prevented = true; },
    });
    assert.equal(prevented, false, 'must keep the native menu for editable fields');
});

test('posts a jsRuntimeError message when an uncaught error event fires', () => {
    // Reset the rpcPostMessage module state so a prior test's surface
    // does not leak into this test.
    __resetForTests();

    const posted: Array<{ name: string; body: Record<string, unknown> }> = [];

    // Build a fake `window` with event listener support and webkit mock.
    const listeners: Record<string, Array<(evt: unknown) => void>> = {};
    const w: Record<string, unknown> = {
        webkit: {
            messageHandlers: {
                jsRuntimeError: {
                    postMessage: (body: Record<string, unknown>) => {
                        posted.push({ name: 'jsRuntimeError', body });
                    },
                },
                rpcTimeoutAlert: {
                    postMessage: (body: Record<string, unknown>) => {
                        posted.push({ name: 'rpcTimeoutAlert', body });
                    },
                },
            },
        },
        addEventListener: (type: string, fn: (evt: unknown) => void) => {
            (listeners[type] ??= []).push(fn);
        },
        dispatchEvent: (evt: Event) => {
            (listeners[evt.type] ?? []).forEach((fn) => fn(evt));
            return true;
        },
    };
    (globalThis as Record<string, unknown>).window = w;
    (globalThis as Record<string, unknown>).document = {
        addEventListener: () => {},
    };

    webViewBootstrap({ env: { launch: () => {} } });

    // The bootstrap wraps setUnhandledExceptionHandler so it
    // ALSO posts to jsRuntimeError when the registered handler is invoked.
    const handlerCalls: string[] = [];
    (w.setUnhandledExceptionHandler as (h: () => void) => void)(() => {
        handlerCalls.push('called');
    });

    // Synthesize an uncaught error event.
    const err = new Error('boom');
    (w.dispatchEvent as (evt: { type: string; error: Error }) => boolean)({
        type: 'error',
        error: err,
    });

    // Assert the user-installed handler AND the post-message both happened.
    assert.equal(handlerCalls.length, 1);
    assert.equal(posted.length, 1);
    assert.equal(posted[0].name, 'jsRuntimeError');
    assert.equal((posted[0].body as { message: string }).message, 'boom');
});

test('installs rpcTimeoutAlert surface that posts to webkit', () => {
    __resetForTests();

    const posted: Array<Record<string, unknown>> = [];

    const w: Record<string, unknown> = {
        webkit: {
            messageHandlers: {
                rpcTimeoutAlert: {
                    postMessage: (body: Record<string, unknown>) => posted.push(body),
                },
            },
        },
        addEventListener: () => {},
        dispatchEvent: () => true,
    };
    (globalThis as Record<string, unknown>).window = w;
    (globalThis as Record<string, unknown>).document = {
        addEventListener: () => {},
    };

    webViewBootstrap({ env: { launch: () => {} } });

    // Retrieve the surface hook installed by webViewBootstrap
    // and invoke it directly to verify the post.
    const surface = __getRpcTimeoutAlertSurface();
    assert.notEqual(surface, null, 'surface must be installed by webViewBootstrap');
    surface?.();
    assert.equal(posted.length, 1);
    assert.equal((posted[0] as { count: number }).count, 3);
});

test('a securitypolicyviolation event is reported through the jsRuntimeError channel and bounded', () => {
    __resetForTests();

    const posted: Array<{ name: string; body: Record<string, unknown> }> = [];
    const listeners: Record<string, Array<(evt: unknown) => void>> = {};
    const w: Record<string, unknown> = {
        webkit: {
            messageHandlers: {
                jsRuntimeError: {
                    postMessage: (body: Record<string, unknown>) => {
                        posted.push({ name: 'jsRuntimeError', body });
                    },
                },
            },
        },
        addEventListener: (type: string, fn: (evt: unknown) => void) => {
            (listeners[type] ??= []).push(fn);
        },
        dispatchEvent: (evt: { type: string }) => {
            (listeners[evt.type] ?? []).forEach((fn) => fn(evt));
            return true;
        },
    };
    (globalThis as Record<string, unknown>).window = w;
    (globalThis as Record<string, unknown>).document = {
        addEventListener: () => {},
    };

    webViewBootstrap({ env: { launch: () => {} } });

    const violationEvent = {
        type: 'securitypolicyviolation',
        blockedURI: 'https://evil.example.com/script.js',
        violatedDirective: 'script-src',
        effectiveDirective: 'script-src-elem',
        documentURI: 'file:///AdguardMini.app/Contents/Resources/WebUI/tray.html',
        sourceFile: 'file:///AdguardMini.app/Contents/Resources/WebUI/tray.html',
        lineNumber: 42,
        columnNumber: 7,
    };

    (w.dispatchEvent as (evt: { type: string }) => boolean)(violationEvent);

    assert.equal(posted.length, 1);
    assert.equal(posted[0].name, 'jsRuntimeError');
    const message = (posted[0].body as { message: string }).message;
    assert.match(message, /CSP violation:/);
    assert.match(message, /blockedURI=https:\/\/evil\.example\.com\/script\.js/);
    assert.match(message, /violatedDirective=script-src/);
    assert.match(
        (posted[0].body as { stack?: string }).stack ?? '',
        /:42:7$/,
    );
    // CSP violations are tagged non-fatal so the platform can log/telemetry
    // them without surfacing the native load-failure alert.
    assert.equal((posted[0].body as { kind?: string }).kind, 'csp-violation');

    // 100 rapid identical violations → still one record (bounded).
    for (let i = 0; i < 100; i += 1) {
        (w.dispatchEvent as (evt: { type: string }) => boolean)(violationEvent);
    }
    assert.equal(posted.length, 1);
});
