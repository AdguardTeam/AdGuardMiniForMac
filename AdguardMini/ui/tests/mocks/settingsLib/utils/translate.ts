// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Test stub for `SettingsLib/utils/translate`. The real module
 * (`modules/settings/lib/utils/translate.tsx`) imports React components
 * (`ContactSupportLink`) and the `tx` theme global — not Node-loadable in the
 * test runner. Production resolves `SettingsLib/*` via the bundler alias;
 * `testMockAliases()` in `vitest.config.mjs` points it here.
 * `SettingsCallbackServiceInternal` imports only
 * `getNotificationSettingsImportFailedText` from this module.
 */

/** Fixed text stand-in for the real settings-import-failed translation. */
export function getNotificationSettingsImportFailedText(): string {
    return 'settings import failed';
}

/**
 * Stand-in for the real contact-support parameter builder. The ambient
 * `translate` stub resolves messages without parameters, so the returned
 * parameters are never read.
 *
 * @param _props Link props the real builder forwards (unused).
 * @returns Empty translation parameters.
 */
export function provideContactSupportParam(_props?: Record<string, unknown>): Record<string, unknown> {
    return {};
}

/** Fixed text stand-in for the real generic "something went wrong" translation. */
export function getNotificationSomethingWentWrongText(): string {
    return 'something went wrong';
}
