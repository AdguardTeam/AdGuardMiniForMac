// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Node-test stub for the `Intl` module. The real `Intl`
 * (`modules/common/intl/index.ts`) imports ~40 locale JSON files and the
 * `@adg/webview-utils-kit` workspace package, neither of which is
 * Node-loadable in the test runner. Production resolves `Intl` to the real
 * module via webpack; only `tsconfig.node-tests.json` maps `Intl` here.
 */

// The real `Intl` module declares the ambient `translate` global (its
// `declare global { const translate: TranslatorShortcut }` block). The
// callback `*Internal` services call `translate(...)` at runtime, so the
// mock must both declare AND install it. Ambient `var` (not `const`) so the
// assignment below is legal.
declare global {
    // eslint-disable-next-line no-var
    var translate: (key: string) => string;
}

// Install the runtime `translate` used by the callback internals
// (e.g. `SettingsCallbackServiceInternal.OnImportStateChange`).
globalThis.translate = (key: string) => key;

/** No-op stand-in for the real `updateLanguage`. */
export function updateLanguage(_language: string) {
    // Intentionally empty: the translator side-effect is not exercised in
    // node tests.
}
