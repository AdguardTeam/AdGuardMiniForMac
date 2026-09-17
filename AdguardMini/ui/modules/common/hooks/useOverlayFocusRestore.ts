// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useRef } from 'preact/hooks';

import { captureFocusSnapshot, restoreFocus } from 'Common/lib/focusRestore';
import { focusWasLost } from 'Common/lib/overlayFocus';

import type { FocusRestoreSnapshot } from 'Common/lib/focusRestore';
import type { OverlayFocusPlan } from 'Common/lib/overlayFocus';
import type { RefObject } from 'preact';

/**
 * Focus restore for stateful overlays — dropdown lists, selects and context
 * menus that stay mounted and open and close repeatedly.
 *
 * `useFocusRestore` is tied to mount/unmount and would restore long after such
 * an overlay has closed, or across reopen cycles; this hook ties one snapshot
 * to one open/close cycle instead. Call `captureOnOpen` in the same task as
 * the activation that opens the overlay, and `applyClosePlan` on every close
 * with the plan `resolveOverlayFocusPlan` returns.
 *
 * The snapshot is consumed by the first close, so several close paths firing
 * for one interaction cannot restore twice. The overlay's root ref lets the
 * deferred `restore-if-lost` check treat focus still resting inside the
 * closing overlay as lost: an outside press that never moves focus leaves the
 * formerly focused option active while the commit hides it.
 *
 * @param overlayRef Ref to the overlay's root element.
 * @returns Handlers to capture on open and to apply the close plan.
 */
export function useOverlayFocusRestore(overlayRef: RefObject<HTMLElement>): {
    captureOnOpen(): void;
    applyClosePlan(plan: OverlayFocusPlan): void;
} {
    const snapshotRef = useRef<FocusRestoreSnapshot | null>(null);

    const captureOnOpen = useCallback(() => {
        snapshotRef.current = captureFocusSnapshot();
    }, []);

    const applyClosePlan = useCallback((plan: OverlayFocusPlan) => {
        const snapshot = snapshotRef.current;
        snapshotRef.current = null;

        if (snapshot === null || plan === 'keep') {
            return;
        }

        if (plan === 'restore') {
            restoreFocus(snapshot);
            return;
        }

        // `restore-if-lost` runs after the pointer press that closed the
        // overlay has finished: the browser applies the mousedown focus
        // default action after the listeners, and this microtask runs after
        // it, so a press that moved focus onto a control keeps it while a
        // press that left no usable focus behind — including focus stranded
        // on the closing overlay's own hidden option — restores the opener.
        queueMicrotask(() => {
            if (focusWasLost(overlayRef.current)) {
                restoreFocus(snapshot);
            }
        });
    }, [overlayRef]);

    return { captureOnOpen, applyClosePlan };
}
