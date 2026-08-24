// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useContext } from 'preact/compat';

import SettingsStore from 'SettingsStore';

/**
 * Hook for settings store
 */
export function useSettingsStore() {
    return useContext(SettingsStore);
}
