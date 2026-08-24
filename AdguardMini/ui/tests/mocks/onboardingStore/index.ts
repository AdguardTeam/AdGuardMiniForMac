// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Node-test stub for the `OnboardingStore` module alias. The real module
 * (`modules/onboarding/store/index.ts`) constructs the full onboarding store
 * singleton at import time (RPC calls + browser-only dependencies) — not
 * Node-loadable in the test runner. Production resolves `OnboardingStore` via
 * webpack; only `tsconfig.node-tests.json` maps it here.
 *
 * `OnboardingCallbackServiceInternal.OnEffectiveThemeChanged` calls
 * `store.steps.setEffectiveTheme`; tests install a fake `steps` object and
 * reset it between cases.
 */

/** Loose store holder; sub-stores are installed by each test case. */
export const store: Record<string, any> = {};

/** Test helper: removes every installed sub-store (mirror of `__resetForTests`). */
export function __resetOnboardingTestStore(): void {
    for (const key of Object.keys(store)) {
        delete (store as Record<string, unknown>)[key];
    }
}
