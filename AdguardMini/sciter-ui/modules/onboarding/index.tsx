// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { instantiateLogger, LogLevel } from '@adg/sciter-utils-kit';
import 'expose-loader?exposes=preactHooks!preact/hooks';
import { render } from 'preact';
// eslint-disable-next-line import/no-unresolved
import 'SciterPolyfills';

// Default css styles (reset, colors, dark/light)...
import 'Modules/onboarding/lib/callbacks';
import 'Theme/default';

import '../common/api';

import { App } from './components/App';

window.log = instantiateLogger(FULL_LOGS, LogLevel.ERR);

window.SciterWindow.caption = 'AdGuard Mini';
// eslint-disable-next-line
// @ts-ignore
document.ready = () => {
    const node = document.getElementById('app')!;
    render(<App />, node);
};
