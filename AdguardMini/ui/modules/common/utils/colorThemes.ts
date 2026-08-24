// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { EffectiveTheme } from 'Apis/types';

export enum SUPPORTED_COLOR_THEMES {
    dark = 'dark',
    light = 'light',
}

export type ColorTheme = keyof typeof SUPPORTED_COLOR_THEMES;

export type OnColorThemeChanged = (colorTheme: ColorTheme) => void;

export type UseColorTheme = (onThemeChanged: OnColorThemeChanged) => void;

/**
 * Get supported color theme from effective color theme
 * @param colorTheme Effective color theme
 */
export function getColorTheme(colorTheme: EffectiveTheme): ColorTheme {
    switch (colorTheme) {
        case EffectiveTheme.dark: return SUPPORTED_COLOR_THEMES.dark;
        case EffectiveTheme.light: return SUPPORTED_COLOR_THEMES.light;

        default: return SUPPORTED_COLOR_THEMES.light;
    }
}

/**
 * Checks if the color theme is dark
 */
export function isDarkColorTheme(colorTheme: ColorTheme): boolean {
    return colorTheme === SUPPORTED_COLOR_THEMES.dark;
}

/**
 * Applies the theme attribute to the document element
 */
export function applyThemeAttribute(theme: ColorTheme): void {
    document.documentElement.setAttribute('theme', theme);
}
