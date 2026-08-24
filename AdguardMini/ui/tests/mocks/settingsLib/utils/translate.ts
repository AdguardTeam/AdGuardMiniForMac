// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Node-test stub for `SettingsLib/utils/translate`. The real module
 * (`modules/settings/lib/utils/translate.tsx`) imports React components
 * (`ContactSupportLink`) and the `tx` theme global — not Node-loadable in the
 * test runner. Production resolves `SettingsLib/*` via webpack; only
 * `tsconfig.node-tests.json` maps it here. `SettingsCallbackServiceInternal`
 * imports only `getNotificationSettingsImportFailedText` from this module.
 */

/** Fixed text stand-in for the real settings-import-failed translation. */
export function getNotificationSettingsImportFailedText(): string {
    return 'settings import failed';
}
