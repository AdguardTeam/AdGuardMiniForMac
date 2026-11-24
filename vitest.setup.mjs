// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import cx from 'classix';
import * as preactHooks from 'preact/hooks';

// Installs the `tx` global, mirroring the bundler `define`; the mock module
// also declares the ambient type, so components read `tx.typo` at render time.
import './AdguardMini/ui/tests/mocks/theme';

// The vendored kit reads `preactHooks` as a bare global while its module is
// evaluated, so it has to be published before any module imports the kit.
globalThis.preactHooks = preactHooks;

// Injected by the bundler `define` in the real build. `translate` resolves to
// the key itself: tests assert on keys, not on localized text.
globalThis.translate = (key) => key;
globalThis.cx = cx;

// jsdom reports no platform, and CodeMirror resolves `Mod-` against it — without
// this, `Mod-` would mean `Ctrl-` in keyboard tests.
Object.defineProperty(globalThis.navigator, 'platform', {
    value: 'MacIntel',
    configurable: true,
});
