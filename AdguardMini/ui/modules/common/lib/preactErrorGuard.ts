// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/** Patch Preact error handling and report uncaught render errors. */
/* eslint-disable no-console */

import { options } from 'preact';

/** Structural shape of Preact's internal `options._catchError` hook. */
type CatchErrorHook = (
    error: unknown,
    vnode: unknown,
    oldVNode: unknown,
    errorInfo: unknown,
) => void;

let preactErrorGuardInstalled = false;

/** Install wrapper around `_catchError` to log escaped render errors. */
export function installPreactErrorGuard(): void {
    if (preactErrorGuardInstalled) {
        return;
    }
    preactErrorGuardInstalled = true;

    const preactOptions = options as unknown as { _catchError?: CatchErrorHook };
    const originalCatchError = preactOptions._catchError;
    preactOptions._catchError = (error, vnode, oldVNode, errorInfo): void => {
        try {
            if (originalCatchError) {
                originalCatchError(error, vnode, oldVNode, errorInfo);
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            const stack = e instanceof Error ? e.stack : undefined;
            // Neutral prefix: the catch also sees exceptions thrown BY the
            // original `_catchError` hook (e.g. a boundary's
            // `getDerivedStateFromError` failing), not only re-thrown
            // no-boundary errors.
            console.error('[Preact] Uncaught render error:', message, stack || '');
        }
    };
}
