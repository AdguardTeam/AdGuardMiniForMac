// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/*
 * DOM environment for component tests: preact needs a real document, CSS
 * module imports need class-name stubs, and the globals that webpack injects
 * into the bundle (ProvidePlugin) must exist. Import this module before any
 * module that renders.
 */

import Module from 'node:module';

// jsdom ships no type declarations; the constructor is all the tests use.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { JSDOM } = require('jsdom') as {
    JSDOM: new (
        html: string,
        options?: { pretendToBeVisual?: boolean },
    ) => { window: Window & typeof globalThis };
};

const dom = new JSDOM(
    '<!doctype html><html><body><div id="app"></div><div id="notify"></div></body></html>',
    // Preact flushes hook effects on animation frames; without them the flush
    // falls back to a 100 ms timer.
    { pretendToBeVisual: true },
);

const globalScope = globalThis as unknown as Record<string, unknown>;
// `defineProperty` because node exposes `navigator` as a getter-only global.
Object.defineProperty(globalScope, 'window', { value: dom.window, configurable: true });
Object.defineProperty(globalScope, 'document', { value: dom.window.document, configurable: true });
Object.defineProperty(globalScope, 'navigator', { value: dom.window.navigator, configurable: true });
Object.defineProperty(globalScope, 'requestAnimationFrame', {
    value: dom.window.requestAnimationFrame.bind(dom.window),
    configurable: true,
});
Object.defineProperty(globalScope, 'cancelAnimationFrame', {
    value: dom.window.cancelAnimationFrame.bind(dom.window),
    configurable: true,
});
// Injected by webpack's ProvidePlugin in the real build.
globalScope.translate = (key: string) => key;

// CSS modules resolve to generated class names in the real build; the tests
// only need stable, readable strings.
const moduleInternals = Module as unknown as {
    _load(request: string, parent: unknown, isMain: boolean): unknown;
};
const originalLoad = moduleInternals._load;

moduleInternals._load = function loadWithCssModules(request, parent, isMain) {
    if (request.endsWith('.pcss')) {
        return new Proxy({}, {
            get: (_target, property) => {
                // `undefined` for the interop marker, so TypeScript's
                // `__importDefault` wraps the stub instead of taking it for an
                // ES module and reading a `default` string off it.
                if (property === '__esModule') {
                    return undefined;
                }

                return String(property);
            },
        });
    }

    return originalLoad.call(this, request, parent, isMain);
};
