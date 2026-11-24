// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import * as preactHooks from 'preact/hooks';

// The vendored kit resolves `preactHooks` as a bare global, not as an import,
// so the hook surface is published before the module entries run.
window.preactHooks = preactHooks;
