// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useRef, useState } from 'preact/hooks';

import { useTheme } from 'TrayLib/hooks';
import { isDarkColorTheme } from 'Utils/colorThemes';

/**
 * Applies the theme to document.documentElement via requestAnimationFrame
 * as a workaround for a Sciter rendering bug.
 *
 * @returns Whether the current theme is a dark color theme.
 */
export function useThemeWithRAF(): boolean {
    const [isDarkTheme, setIsDarkTheme] = useState(false);
    const rafRef = useRef<number | null>(null);

    useTheme((th) => {
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
            document.documentElement.setAttribute('theme', th);
        });
        setIsDarkTheme(isDarkColorTheme(th));
    });

    return isDarkTheme;
}
