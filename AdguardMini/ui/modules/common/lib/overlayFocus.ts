// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Why a stateful overlay (dropdown list, select, context menu) stopped being
 * open. The reason is the only input to the focus decision below, so the rule
 * each close path follows is visible at its call site.
 */
export type OverlayCloseReason =
    /** Escape dismissed the overlay. */
    | 'escape'
    /** An option or menu action was chosen. */
    | 'action'
    /** The trigger itself toggled the overlay shut. */
    | 'toggle'
    /** A scroll moved the overlay's anchor away. */
    | 'scroll'
    /** A pointer press landed outside the overlay. */
    | 'outside-pointer'
    /** Tab moved focus out of the overlay. */
    | 'focus-leave'
    /** The pointer left a hover tooltip, or its display timer elapsed. */
    | 'hover';

/**
 * How a closing overlay treats focus: `restore` moves focus back to the
 * opener; `restore-if-lost` leaves the decision to the outside pointer press
 * (see `useOverlayFocusRestore`); `keep` leaves focus where the user moved it.
 */
export type OverlayFocusPlan = 'restore' | 'restore-if-lost' | 'keep';

/**
 * Pure close decision: which focus plan a close reason follows.
 *
 * Focus is already elsewhere after a focus-leave close (the browser moved it),
 * and an outside pointer press may have taken focus itself, so neither may
 * blindly restore. A hover tooltip appears and disappears around the pointer
 * and never moves focus, so its close leaves focus alone too. Every other
 * close leaves the control the user was operating, so focus returns to the
 * overlay's opener.
 *
 * @param reason Why the overlay closed.
 * @returns The focus plan for that close path.
 */
export function resolveOverlayFocusPlan(reason: OverlayCloseReason): OverlayFocusPlan {
    if (reason === 'focus-leave' || reason === 'hover') {
        return 'keep';
    }

    if (reason === 'outside-pointer') {
        return 'restore-if-lost';
    }

    return 'restore';
}

/**
 * Pure Tab-exit decision for an open dropdown list: Tab on the last option
 * and Shift+Tab on the first leave the list, so the list must close; Tab
 * between options (and Tab off the header into the list) must not.
 *
 * @param shiftKey Whether the Tab press also held Shift.
 * @param isFirstOption Whether the focused option is the list's first.
 * @param isLastOption Whether the focused option is the list's last.
 * @returns `true` when the list should close because focus is leaving it.
 */
export function shouldCloseOnOptionTab(
    shiftKey: boolean,
    isFirstOption: boolean,
    isLastOption: boolean,
): boolean {
    return shiftKey ? isFirstOption : isLastOption;
}

/**
 * Whether the window's focus no longer rests on a control the user can use:
 * it is on the body or the root, on a detached or unrendered element, or on
 * an element inside the overlay that just closed (whose commit hides closed
 * options, so that element can neither be seen nor focused again). This is
 * the state an outside pointer press leaves behind when it did not move focus
 * onto a control, which is when a closing overlay must restore its opener — a
 * right or Control click outside, in particular, never moves focus, so the
 * previously focused option would otherwise stay active while hidden.
 *
 * @param overlay Root of the overlay that just closed, if any.
 * @returns `true` when no usable control outside the overlay holds focus.
 */
export function focusWasLost(overlay: Element | null): boolean {
    const active = document.activeElement;

    if (active === null || active === document.body || active === document.documentElement) {
        return true;
    }

    // The usability convention is the one `focusRestore` uses: an element
    // without a document or without layout boxes cannot take focus again.
    if (active instanceof HTMLElement && (!active.isConnected || active.getClientRects().length === 0)) {
        return true;
    }

    return overlay !== null && overlay.contains(active);
}
