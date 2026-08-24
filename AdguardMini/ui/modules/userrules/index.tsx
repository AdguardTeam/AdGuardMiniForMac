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

window.log = instantiateLogger(FULL_LOGS);

const node = document.getElementById('app');
if (node) {
    render(<App />, node);
}
