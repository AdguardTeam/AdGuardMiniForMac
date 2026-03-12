// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useContext } from 'preact/hooks';

import { SafariProtectionContext } from '../components/SafariProtectionContext';

/**
 * Hook to access Safari protection context
 */
export function useSafariProtectionContext() {
    const ctx = useContext(SafariProtectionContext);
    if (!ctx) {
        throw new Error('SafariProtectionContext is not provided');
    }

    return ctx;
}
