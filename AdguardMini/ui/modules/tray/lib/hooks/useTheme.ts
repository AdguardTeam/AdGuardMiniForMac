// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useLayoutEffect } from 'preact/hooks';

import { useTrayStore } from 'TrayLib/hooks';
import { getColorTheme } from 'Utils/colorThemes';

import type { OnColorThemeChanged } from 'Utils/colorThemes';

/**
 * Hook for theme changes
 */
export function useTheme(onThemeChanged: OnColorThemeChanged) {
    const trayStore = useTrayStore();
    const { effectiveTheme } = trayStore.settings;

    useLayoutEffect(() => {
        if (effectiveTheme !== null) {
            onThemeChanged(getColorTheme(effectiveTheme));
        }
    }, [effectiveTheme, onThemeChanged]);
}
