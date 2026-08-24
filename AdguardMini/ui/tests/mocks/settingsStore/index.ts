// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Node-test stub for the `SettingsStore` module alias. The real module
 * (`modules/settings/store/index.ts`) constructs the full `SettingsStore`
 * singleton at import time, which fires RPC calls and pulls in browser-only
 * dependencies (React components, `SettingsLib/*`). Neither is Node-loadable
 * in the test runner. Production resolves `SettingsStore` via webpack; only
 * `tsconfig.node-tests.json` maps it here.
 *
 * The callback `*Internal` services bind to this exported `store` object at
 * import time, so tests install per-case fakes by assigning sub-stores
 * (`store.settings = {...}`) and calling `__resetSettingsTestStore()` between
 * cases.
 */

/**
 * Loose store holder; sub-stores are installed by each test case. Typed `any`
 * (not `Record<string, any>`) so the mocked singleton is assignable to
 * structural store types the callback internals require.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const store: any = {};

/** Test helper: removes every installed sub-store (mirror of `__resetForTests`). */
export function __resetSettingsTestStore(): void {
    for (const key of Object.keys(store)) {
        delete (store as Record<string, unknown>)[key];
    }
}
