// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect } from 'preact/hooks';

import type { RefObject } from 'preact';

/**
 * Selector for elements that can hold keyboard focus.
 *
 * `[tabindex="-1"]` is deliberately excluded: headings marked focusable so a
 * dialog can move focus to them are valid targets programmatically, but must
 * not become tab stops.
 */
const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Returns the container's focusable elements in document order, skipping the
 * ones hidden from assistive tech or from view.
 *
 * @param container - Element to search within.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((el) => !el.closest('[aria-hidden="true"]') && el.offsetParent !== null);
}

/**
 * Keeps Tab navigation inside a dialog for as long as it is open.
 *
 * `aria-modal` confines the VoiceOver cursor but has no effect on keyboard
 * focus, so without this Tab walks straight out of a dialog and onto the
 * controls it covers — which are unreachable by mouse and, for a sighted
 * keyboard user, invisible behind the overlay.
 *
 * @param containerRef - Ref to the dialog element.
 * @param isActive - Whether the trap is armed. Defaults to `true`.
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement>, isActive: boolean = true) {
    useEffect(() => {
        if (!isActive) {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !containerRef.current) {
                return;
            }

            const focusable = getFocusableElements(containerRef.current);
            if (focusable.length === 0) {
                // Nothing to land on inside the dialog — keep focus where it
                // is rather than letting it escape to the page behind.
                e.preventDefault();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement as HTMLElement | null;

            // Focus parked on the dialog or its heading counts as "before the
            // first element", so Tab enters the dialog instead of leaving it.
            if (active === null || !containerRef.current.contains(active)) {
                e.preventDefault();
                (e.shiftKey ? last : first).focus();
                return;
            }

            if (e.shiftKey && (active === first || !focusable.includes(active))) {
                e.preventDefault();
                last.focus();
                return;
            }

            if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [containerRef, isActive]);
}
