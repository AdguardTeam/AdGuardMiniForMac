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

        default: return EffectiveTheme.light;
    }
}

/**
 * Checks if the color theme is dark
 */
export function isDarkColorTheme(colorTheme: ColorTheme): boolean {
    return colorTheme === SUPPORTED_COLOR_THEMES.dark;
}

/**
 * Returns the system color theme based on the Sciter `ui-ambience` media
 * variable. This is set synchronously during window creation from macOS
 * `effectiveAppearance`, so it is available BEFORE Preact renders — unlike
 * the async xcall-based `getEffectiveTheme`.
 *
 * Sciter sets `_media_vars["ui-ambience"]` in `view.mm:206` by reading
 * `[NSApp effectiveAppearance]`.
 */
export function getSystemColorTheme(): ColorTheme | null {
    try {
        // `window.SciterWindow` is the current Sciter window instance, set by
        // `sciterBootstrap` during HTML load (before `document.ready` fires).
        // `mediaVar('ui-ambience')` reflects the macOS effective appearance
        // ("dark" or "light") and is set synchronously during window creation.
        const ambience = window.SciterWindow.mediaVar('ui-ambience');
        if (ambience === 'dark') {
            return SUPPORTED_COLOR_THEMES.dark;
        }
        if (ambience === 'light') {
            return SUPPORTED_COLOR_THEMES.light;
        }
    } catch {
        // mediaVar might not be available in all contexts
    }
    return null;
}

/**
 * Applies the initial theme attribute and resolves to the effective theme.
 *
 * MUST be awaited BEFORE calling `render(<App />, node)`.
 *
 * Sciter loads HTML, computes an initial layout/measure pass, THEN fires
 * `document.ready` (which triggers Preact render). During that initial
 * measure pass, the hardcoded `theme="light"` attribute from the HTML
 * template is used. If the system or user preference is dark mode, all
 * elements get the WRONG colors.
 *
 * This function first synchronously applies the system appearance (from
 * the `ui-ambience` media variable) as an interim, then fetches the
 * user's saved theme preference via xcall. If the user explicitly chose
 * "light" or "dark", that theme is applied. If the user chose "system",
 * the already-applied system theme is kept.
 *
 * By awaiting this before `render()`, Preact-created elements are styled
 * with the correct theme on first paint, eliminating the flash of
 * wrong-colored translator-rendered elements (AG-56246).
 *
 * @param getEffectiveTheme - Async function that returns the user's
 *   `EffectiveTheme` via xcall (e.g. `settingsStore.getEffectiveTheme()`).
 * @returns The resolved `ColorTheme`, or `null` if it could not be
 *   determined (caller should fall back to `applyThemeAttribute`).
 */
export async function applyInitialTheme(
    fetchEffectiveTheme?: () => Promise<EffectiveTheme>,
): Promise<ColorTheme | null> {
    // Step 1: Apply the system appearance synchronously as a best-effort
    // interim. `ui-ambience` is set during window creation, before
    // `document.ready` fires, so this is available immediately.
    const systemTheme = getSystemColorTheme();
    if (systemTheme) {
        document.documentElement.setAttribute('theme', systemTheme);
    }

    // Step 2: If a getter for the user's saved preference is provided,
    // fetch and apply it. This resolves "system" vs explicit "light"/"dark".
    if (fetchEffectiveTheme) {
        try {
            const effectiveTheme = await fetchEffectiveTheme();
            const colorTheme = getColorTheme(effectiveTheme);
            document.documentElement.setAttribute('theme', colorTheme);
            return colorTheme;
        } catch {
            // xcall failed — keep the system theme applied above.
        }
    }

    return systemTheme;
}

/**
 * Pending `requestAnimationFrame` id for a deferred theme attribute update.
 */
let themeRafId: number | null = null;

/**
 * Applies the theme attribute to the document element, combining a
 * synchronous set with a deferred `requestAnimationFrame` re-application.
 *
 * Sciter does not reliably restyle elements when the `theme` attribute is
 * changed during Preact's `useLayoutEffect` (AG-51217). The synchronous
 * `setAttribute` changes the attribute immediately and registers
 * `invalid_style_root` via `drop_styles`, but Sciter's update queue
 * (which calls `resolve_styles`) is only processed during
 * `commit_update` — which runs inside `on_animation_tick` (via
 * `do_animation`) or during `paint()`. When the window is hidden,
 * neither fires, so `invalid_style_root` remains unprocessed.
 *
 * To guarantee the update queue runs, a `requestAnimationFrame` is also
 * scheduled. The RAF registers a `script_frame_animator` on the view's
 * `animating` list. When the window becomes visible (or on the next
 * animation frame if already visible), `on_animation_tick` invokes
 * `do_animation`, which calls `commit_update(false)` at its end.
 * Even if the RAF callback itself is cancelled, the animator's presence
 * ensures `commit_update` runs, processing the `invalid_style_root`
 * set by the synchronous `setAttribute`.
 *
 * See `html-animator.cpp:do_animation`, `html-view.cpp:commit_update`,
 * `html-dom.cpp:element::set_attr`, and
 * `html-view-update-queue.cpp:update_queue::update`.
 */
export function applyThemeAttribute(theme: ColorTheme): void {
    // Synchronous set — changes the attribute immediately and triggers
    // `drop_styles` which marks `invalid_style_root`.
    document.documentElement.setAttribute('theme', theme);

    // Schedule a RAF to guarantee `commit_update` runs. The RAF
    // registration adds an animator to `animating`, ensuring
    // `do_animation` → `commit_update` → `resolve_styles` is called
    // even when the window was hidden at the time of the synchronous set.
    if (themeRafId != null) {
        cancelAnimationFrame(themeRafId);
    }
    themeRafId = requestAnimationFrame(() => {
        document.documentElement.setAttribute('theme', theme);
        themeRafId = null;
    });
}