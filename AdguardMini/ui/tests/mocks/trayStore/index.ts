// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Node-test stub for the `TrayStore` module alias. The real module
 * (`modules/tray/store/index.ts`) constructs the full tray store singleton —
 * not Node-loadable in the test runner. `TrayCallbackServiceImpl`'s
 * transitive type-only imports (`modules/tray/store/modules/Settings.ts`)
 * reference `TrayStore` purely as a type, so only the type surface is needed
 * here. Production resolves `TrayStore` via webpack; only
 * `tsconfig.node-tests.json` maps it here.
 */

/**
 * Loose stand-in for the tray store type (not instantiated in tests).
 * `Record<string, any>` mirrors the settings mock's loose structural typing:
 * the callback internals assign arbitrary sub-store objects to `store`.
 */
export type TrayStore = Record<string, any>;

/** Loose store holder for any future direct tray-store usage. */
export const store: Record<string, any> = {};

/** Test helper: removes every installed sub-store (mirror of `__resetForTests`). */
export function __resetTrayTestStore(): void {
    for (const key of Object.keys(store)) {
        delete (store as Record<string, unknown>)[key];
    }
}
