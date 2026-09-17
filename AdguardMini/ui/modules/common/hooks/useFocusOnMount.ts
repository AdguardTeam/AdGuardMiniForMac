// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect } from 'preact/hooks';

import { rememberFocusedHeading } from 'Common/lib/focusRestore';

/**
 * Moves focus to the element with the given id once it mounts.
 *
 * Used by page and step headings to announce themselves: swapping a screen
 * leaves focus on the control that triggered the swap, so without this the new
 * screen arrives silently and the user has to go looking for it.
 *
 * A heading owns this rather than the router that renders it. A router can
 * only find the heading by querying the document, which has to guess at a
 * selector — and the guesses were wrong in both directions: a bare `h4` lookup
 * matched the first heading anywhere on screen (an open overlay's, say), while
 * a container-scoped one silently skipped pages that build their own heading.
 * The heading knows its own id, so there is nothing left to guess.
 *
 * The element must be focusable — `tabIndex` of `-1` is enough and adds no tab
 * stop.
 *
 * The focused heading is also recorded as the fallback target for focus
 * restore (see `focusRestore`): when the control that opened a dialog is gone
 * by the time it closes, focus lands on the heading of the surface behind.
 *
 * @param elementId - Id of the element to focus.
 * @param isActive - Whether to focus at all. Defaults to `true`.
 */
export function useFocusOnMount(elementId: string, isActive: boolean = true) {
    useEffect(() => {
        if (!isActive) {
            return;
        }

        const heading = document.getElementById(elementId);
        heading?.focus();

        if (heading !== null) {
            rememberFocusedHeading(heading);
        }
    }, [elementId, isActive]);
}
