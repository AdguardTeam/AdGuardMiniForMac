// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useContext } from 'preact/compat';

import TrayStore from 'TrayStore';

/**
 * Hook for tray store
 */
export function useTrayStore() {
    return useContext(TrayStore);
}
