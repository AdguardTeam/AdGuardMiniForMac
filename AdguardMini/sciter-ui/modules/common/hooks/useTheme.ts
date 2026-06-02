// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useLayoutEffect } from 'preact/hooks';

import { Theme, type EffectiveTheme } from 'Apis/types';
import { getColorTheme, getEffectiveTheme } from 'Utils/colorThemes';

import type { Action } from 'Common/utils/EventAction';
import type { OnColorThemeChanged } from 'Utils/colorThemes';

interface UseThemeParams {
    /** Current theme from the store */
    theme: Theme;
    /** Async function to get the effective OS-level theme */
    getEffectiveTheme(): Promise<EffectiveTheme>;
    /** Event triggered when the effective theme changes */
    effectiveThemeChangedEvent: Action<EffectiveTheme>;
}

/**
 * Shared hook for applying theme changes. Listens to store theme and
 * system-level effective theme events, then invokes the callback.
 *
 * @param onThemeChanged — callback that receives the resolved color theme string
 * @param params — module-specific theme dependencies
 */
export function useTheme(onThemeChanged: OnColorThemeChanged, params: UseThemeParams): void {
    const { theme, getEffectiveTheme: fetchTheme, effectiveThemeChangedEvent } = params;

    useLayoutEffect(() => {
        if (theme === Theme.system) {
            (async () => {
                const value = await fetchTheme();
                onThemeChanged(getColorTheme(value));
            })();

            return effectiveThemeChangedEvent.addEventListener((value: EffectiveTheme) => {
                onThemeChanged(getColorTheme(value));
            });
        }

        const value = getEffectiveTheme(theme);
        onThemeChanged(getColorTheme(value));
    }, [theme]);
}
