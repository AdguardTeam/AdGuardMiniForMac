// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { RouterStore } from 'Modules/common/stores/RouterStore';

/**
 * Tray application routes
 */
export enum TrayRoute {
    home = 'home',
    updates = 'updates',
    filters = 'filters',
}

/**
 * Tray router store type
 * Extends the base RouterStore with Tray-specific route types
 */
export type TrayRouterStore = RouterStore<TrayRoute>;

/**
 * Creates and returns a tray router store
 *
 * @returns A new TrayRouterStore instance for tray navigation
 */
export function trayRouterFactory(): TrayRouterStore {
    return new RouterStore(TrayRoute.home);
}
