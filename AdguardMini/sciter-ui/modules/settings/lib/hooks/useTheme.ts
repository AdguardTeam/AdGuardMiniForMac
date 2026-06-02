// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useTheme as useCommonTheme } from 'Common/hooks/useTheme';
import { useSettingsStore } from 'SettingsLib/hooks';

import type { OnColorThemeChanged } from 'Utils/colorThemes';

/**
 * Settings-specific theme hook adapter.
 */
export function useTheme(onThemeChanged: OnColorThemeChanged) {
    const store = useSettingsStore();
    const { settings: { settings: { theme } } } = store;

    useCommonTheme(onThemeChanged, {
        theme,
        getEffectiveTheme: async () => store.getEffectiveTheme(),
        effectiveThemeChangedEvent: store.settingsWindowEffectiveThemeChanged,
    });
}
