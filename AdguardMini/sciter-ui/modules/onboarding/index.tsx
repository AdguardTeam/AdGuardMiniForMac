// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'expose-loader?exposes=preactHooks!preact/hooks';
// eslint-disable-next-line import/order
import { instantiateLogger, LogLevel } from '@adg/sciter-utils-kit';
import { render } from 'preact';
// eslint-disable-next-line import/no-unresolved
import 'SciterPolyfills';

// Should be imported before any other module to avoid errors in other modules
import 'Common/api';
import 'Modules/onboarding/lib/callbacks';
// Default css styles (reset, colors, dark/light)...
import 'Theme/default';

import { App } from './components/App';

window.log = instantiateLogger(FULL_LOGS, LogLevel.ERR);

window.SciterWindow.caption = 'AdGuard Mini';
// eslint-disable-next-line
// @ts-ignore
document.ready = () => {
    const node = document.getElementById('app')!;
    render(<App />, node);
};
