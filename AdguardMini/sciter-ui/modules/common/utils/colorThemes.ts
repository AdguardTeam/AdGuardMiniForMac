// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { EffectiveTheme, Theme } from 'Apis/types';

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
 * Get effective color theme from settings
 * @param colorTheme Color theme from settings
 */
export function getEffectiveTheme(colorTheme: Theme): EffectiveTheme {
    switch (colorTheme) {
        case Theme.dark: return EffectiveTheme.dark;
        case Theme.light: return EffectiveTheme.light;
        case Theme.system: return EffectiveTheme.light;
        case Theme.unknown: return EffectiveTheme.light;
    }
}

/**
 * Checks if the color theme is dark
 */
export function isDarkColorTheme(colorTheme: ColorTheme): boolean {
    return colorTheme === SUPPORTED_COLOR_THEMES.dark;
}
