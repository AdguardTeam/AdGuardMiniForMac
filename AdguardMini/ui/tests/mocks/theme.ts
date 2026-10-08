// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Node-test stub for the `Theme` module alias. The real module
 * (`modules/common/theme/index.ts`) imports CSS modules, which resolve only
 * through the webpack pipeline. Production resolves `Theme` via webpack; only
 * `tsconfig.node-tests.json` maps it here.
 *
 * The real module declares the ambient `tx` global (webpack's ProvidePlugin
 * also injects it into every bundle), so the mock declares and installs it
 * too: components read `tx.typo` at render time.
 */

type ThemeStub = {
    typo: Record<string, string | undefined>;
    button: { greenSubmit: string };
};

declare global {
    // eslint-disable-next-line no-var
    var tx: ThemeStub;
}

/** Theme token stand-ins; only the tokens read in tests need values. */
const theme: ThemeStub = {
    typo: {},
    button: { greenSubmit: 'greenSubmit' },
};

globalThis.tx = theme;

export default theme;
