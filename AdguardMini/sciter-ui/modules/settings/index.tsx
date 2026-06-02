// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'expose-loader?exposes=preactHooks!preact/hooks';
// eslint-disable-next-line import/order
import { instantiateLogger } from '@adg/sciter-utils-kit';
import { render } from 'preact';
// eslint-disable-next-line import/no-unresolved
import 'SciterPolyfills';

// Default css styles (reset, colors, dark/light)...
import 'Modules/settings/lib/callbacks';
import 'Theme/default';

import '../common/api';

import { App } from './components/App';

window.log = instantiateLogger(FULL_LOGS);

window.SciterWindow.caption = 'AdGuard Mini';
// eslint-disable-next-line
// @ts-ignore
document.ready = () => {
    const node = document.getElementById('app')!;
    render(<App />, node);
};
