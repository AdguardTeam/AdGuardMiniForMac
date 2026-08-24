// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect } from 'preact/hooks';

import { GetEffectiveThemeRequest } from 'Apis/requests/ThemeService';
import { SUPPORTED_COLOR_THEMES, applyThemeAttribute, getColorTheme } from 'Utils/colorThemes';

import type { EffectiveTheme } from 'Apis/types';

/** Maps effective theme to page `theme` attribute and applies it. */
export const applyResolvedTheme = (theme: EffectiveTheme): void => {
    applyThemeAttribute(getColorTheme(theme));
};

/** Applies effective color theme to the page on mount. */
export function useTheme(): void {
    useEffect(() => {
        let cancelled = false;
        void window.API.Execute(new GetEffectiveThemeRequest())
            .then(({ value }) => {
                if (!cancelled) {
                    applyResolvedTheme(value);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    applyThemeAttribute(SUPPORTED_COLOR_THEMES.light);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);
}
