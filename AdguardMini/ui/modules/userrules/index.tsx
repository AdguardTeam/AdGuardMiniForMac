// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'expose-loader?exposes=preactHooks!preact/hooks';
// eslint-disable-next-line import/order
import { instantiateLogger } from '@adg/webview-utils-kit';
import { render } from 'preact';

import 'Common/api';
import { setupUserrulesWebViewBridge } from 'Modules/userrules/lib/webViewUserrulesBootstrap';
import 'Theme/default';

import { App } from './App';

setupUserrulesWebViewBridge();

// Onigasm's Emscripten glue (bundled in `@adguard/rules-editor`, built with
// `ENVIRONMENT_IS_SHELL=true`) replaces `console.log`/`warn`/`error` with its
// `print` (which resolves to `window.print`) and rolls them back only when the
// factory returns normally. On a synchronous init failure (e.g. a WASM load
// error), `abort()`/`err()` — which are `window.print.bind(console)` — throw
// "Can only call Window.print on instances of Window" before any diagnostic
// reaches the native log, and rules-editor swallows the real error. Replace
// `window.print` with a forwarder to the native log so that diagnostic is
// never lost. The `console.error` is captured here, after the bridge installed
// the console→Swift forwarding and before the editor (and its WASM)
// initializes; at `print` call time `console.error` itself equals `print`, so
// calling it would recurse.
// eslint-disable-next-line no-console
const printToNativeLog = console.error.bind(console);
window.print = (message?: unknown) => {
    printToNativeLog('[userrules] onigasm glue:', message);
};

window.log = instantiateLogger(FULL_LOGS);

const node = document.getElementById('app');
if (node) {
    render(<App />, node);
}
