// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'expose-loader?exposes=preactHooks!preact/hooks';
// eslint-disable-next-line import/order
import { instantiateLogger } from '@adg/webview-utils-kit';
import { render } from 'preact';

// Initialize API and xcall wrapper before any other module imports.
import 'Common/api';
// Initialize the tray callback service and set up the WebView bridge before any other module imports.
import 'Modules/tray/lib/callbacks';
import 'Theme/default';

import { App } from './components/App';

window.log = instantiateLogger(FULL_LOGS);

const node = document.getElementById('app');
if (node) {
    render(<App />, node);
}
