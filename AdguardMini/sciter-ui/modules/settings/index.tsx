// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'expose-loader?exposes=preactHooks!preact/hooks';
// eslint-disable-next-line import/order
import { instantiateLogger } from '@adg/sciter-utils-kit';
import { render } from 'preact';
// eslint-disable-next-line import/no-unresolved
import 'SciterPolyfills';

import { GetEffectiveThemeRequest } from 'Apis/requests/ThemeService';
// Default css styles (reset, colors, dark/light)...
import 'Common/api';
import 'Modules/settings/lib/callbacks';
import 'Theme/default';
import { applyInitialTheme } from 'Utils/colorThemes';

import { App } from './components/App';

import type { EffectiveTheme } from 'Apis/types';

window.log = instantiateLogger(FULL_LOGS);

window.SciterWindow.caption = 'AdGuard Mini';
// eslint-disable-next-line
// @ts-ignore
document.ready = async () => {
    // Fetch and apply the user's theme BEFORE render so Preact-created
    // elements are styled with the correct theme on first paint (AG-56246).
    const getEffectiveTheme = async (): Promise<EffectiveTheme> => {
        const { value } = await window.API.Execute(new GetEffectiveThemeRequest());
        return value;
    };
    await applyInitialTheme(getEffectiveTheme);
    const node = document.getElementById('app')!;
    render(<App />, node);
};
