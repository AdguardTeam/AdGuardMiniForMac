// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useLayoutEffect } from 'preact/hooks';

import { Theme, type EffectiveTheme } from 'Apis/types';
import { useTrayStore } from 'TrayLib/hooks';
import { getColorTheme, getEffectiveTheme } from 'Utils/colorThemes';

import type { OnColorThemeChanged } from 'Utils/colorThemes';

/**
 * Hook for theme changes
 */
export function useTheme(onThemeChanged: OnColorThemeChanged) {
    const trayStore = useTrayStore();
    const { trayWindowEffectiveThemeChanged, settings: { settings: globalSettings } } = trayStore;
    const { theme } = globalSettings ?? { theme: Theme.system };

    useLayoutEffect(() => {
        // Skip when settings haven't loaded yet — the initial theme was
        // pre-set by `applyInitialTheme()` in index.tsx based on the system
        // appearance. Applying the 'light' default for `Theme.unknown` would
        // override the correct pre-set theme (AG-56246).
        if (theme === Theme.unknown) {
            return;
        }
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
