// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Test stub for the `SettingsLib/hooks` barrel. The real hooks read the
 * settings store through a preact context that only the running settings
 * module provides. Tests install the sub-stores they need on the shared
 * `SettingsStore` stub and read them through this hook.
 */

import { store } from 'SettingsStore';

/**
 * Returns the settings store installed by the current test case.
 *
 * @returns The shared settings store stub.
 */
export function useSettingsStore() {
    return store;
}
