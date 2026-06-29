// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'expose-loader?exposes=preactHooks!preact/hooks';
import { render } from 'preact';

// Default css styles (reset, colors, dark/light)...
import 'Theme/default';

import { App } from './App';
import './reset.css';

const node = document.getElementById('app')!;
render(<App />, node);
