// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect } from 'preact/hooks';

/**
 * Polls Safari extensions status via requestAnimationFrame while loading.
 * Stops automatically when isLoading becomes false.
 *
 * @param isLoading Whether extensions are still loading.
 * @param getSafariExtensions Callback to fetch extension status.
 */
export function useExtensionPolling(
    isLoading: boolean,
    getSafariExtensions: () => void,
): void {
    useEffect(() => {
        if (!isLoading) {
            return;
        }
        let rafId: number;
        let lastCallTime = Date.now();

        function loop() {
            if (!isLoading) {
                return;
            }
            if (Date.now() - lastCallTime >= 1000) {
                getSafariExtensions();
                lastCallTime = Date.now();
            }
            rafId = requestAnimationFrame(loop);
        }

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [isLoading, getSafariExtensions]);
}
