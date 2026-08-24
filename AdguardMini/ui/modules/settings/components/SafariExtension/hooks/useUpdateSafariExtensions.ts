// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';

/**
 * Updates the state of the safari extensions on window focus
 */
export function useUpdateSafariExtensions() {
    const { settings } = useSettingsStore();

    useEffect(() => {
        // WKWebView fires the standard `window` `focus` event when the
        // hosting `NSWindow` becomes key — the native equivalent of the
        // former Sciter `activate` event.
        const handleActivate = () => {
            // Attach a catch so a rejected RPC (timeout/unavailable bridge)
            // cannot surface as an unhandled rejection in the error reporter.
            settings.getSafariExtensions().catch((err) => {
                // eslint-disable-next-line no-console
                console.error('[useUpdateSafariExtensions] refresh failed:', err);
            });
        };

        window.addEventListener('focus', handleActivate);

        return () => {
            window.removeEventListener('focus', handleActivate);
        };
    }, [settings]);
}
