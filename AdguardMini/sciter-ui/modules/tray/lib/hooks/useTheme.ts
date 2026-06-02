// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Theme } from 'Apis/types';
import { useTheme as useCommonTheme } from 'Common/hooks/useTheme';
import { useTrayStore } from 'TrayLib/hooks';

import type { OnColorThemeChanged } from 'Utils/colorThemes';

/**
 * Tray-specific theme hook adapter.
 */
export function useTheme(onThemeChanged: OnColorThemeChanged) {
    const store = useTrayStore();
    const { settings: { settings: globalSettings } } = store;
    const { theme } = globalSettings ?? { theme: Theme.system };

    useCommonTheme(onThemeChanged, {
        theme,
        getEffectiveTheme: async () => store.getEffectiveTheme(),
        effectiveThemeChangedEvent: store.trayWindowEffectiveThemeChanged,
    });
}
