// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

import { captureFocusSnapshot, restoreFocus } from 'Common/lib/focusRestore';

import type { FocusRestoreSnapshot } from 'Common/lib/focusRestore';

/**
 * Returns focus to the control that opened a surface when the surface
 * unmounts, with the page heading and the window body as fallbacks.
 *
 * The snapshot is taken in a layout effect, so it runs before any passive
 * effect of the same commit — in particular before the surface's own
 * focus-on-open effect, which would otherwise be captured as the opener. The
 * opener itself is normally the element the activation tracker recorded when
 * the surface was opened, which is how a mouse-clicked native button (never
 * focused by WebKit) and a control removed by the opening commit are still
 * remembered.
 *
 * Every mounted surface keeps its own snapshot, which is what makes nested
 * dialogs restore to the control inside the outer dialog: the inner dialog
 * captured that control while it was still the active element.
 *
 * @param isActive Whether the surface participates in focus restore. Pass
 * `false` for instances that are not surfaces (for example the same component
 * rendered as a page), so they neither capture nor restore.
 */
export function useFocusRestore(isActive: boolean = true): void {
    const snapshotRef = useRef<FocusRestoreSnapshot | null>(null);

    useLayoutEffect(() => {
        if (!isActive || snapshotRef.current !== null) {
            return;
        }

        snapshotRef.current = captureFocusSnapshot();
    }, [isActive]);

    useEffect(() => () => {
        const snapshot = snapshotRef.current;
        snapshotRef.current = null;

        if (snapshot !== null) {
            restoreFocus(snapshot);
        }
    }, []);
}
