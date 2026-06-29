// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { RouteName } from 'SettingsStore/modules';

/**
 * Router params for filters page. Used for open Filters page from Safari protection and Safari extensions pages
 */
export type FiltersPageParams = {
    groupId?: number;
    backLink?: RouteName.safari_extensions | RouteName.safari_protection;
    filtersIds?: number[];
};
