// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useLayoutEffect } from 'preact/hooks';

import { useTrayStore } from 'TrayLib/hooks';
import { getColorTheme, getEffectiveTheme } from 'Utils/colorThemes';

import { Theme, type EffectiveTheme } from 'Apis/types';
import type { OnColorThemeChanged } from 'Utils/colorThemes';

/**
 * Hook for theme changes
 */
export function useTheme(onThemeChanged: OnColorThemeChanged) {
    const trayStore = useTrayStore();
    const { trayWindowEffectiveThemeChanged, settings: { settings: globalSettings } } = trayStore;
    const { theme } = globalSettings ?? { theme: Theme.system };

    useLayoutEffect(() => {
        if (theme === Theme.system) {
            (async () => {
                const value = await trayStore.getEffectiveTheme();
                onThemeChanged(getColorTheme(value));
            })();

            return trayWindowEffectiveThemeChanged.addEventListener((value: EffectiveTheme) => {
                onThemeChanged(getColorTheme(value));
            });
        }

        const value = getEffectiveTheme(theme);
        onThemeChanged(getColorTheme(value));
    }, [theme]);
}
