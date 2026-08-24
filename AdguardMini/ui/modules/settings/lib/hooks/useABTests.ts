// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSettingsStore } from './useSettingsStore';

import type { ActiveABTest } from 'Apis/types';

/**
 * Hook to get AB test option
 * @param test - AB test to get option for
 * @returns AB test option
 */
export function useABTest(test: ActiveABTest) {
    const store = useSettingsStore();
    return store.abTests.getOption(test);
}
