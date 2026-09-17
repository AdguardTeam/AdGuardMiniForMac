// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useClickOutside, useEscape, useScrollListener } from '@adg/webview-utils-kit';
import { useCallback, useState } from 'preact/hooks';

import { resolveOverlayFocusPlan } from 'Common/lib/overlayFocus';

import { useOverlayFocusRestore } from './useOverlayFocusRestore';

import type { OverlayCloseReason } from 'Common/lib/overlayFocus';
import type { RefObject } from 'preact';

/**
 * Options for `useOverlay`.
 */
export type UseOverlayOptions = {
    /**
     * Runs when the overlay opens, before its state flips — the place to
     * measure the anchor and place the panel, which is the part of an overlay
     * each component still owns.
     */
    onOpen?(): void;
    /** Closes the overlay when a scroll moves its anchor out of place. */
    closeOnScroll?: boolean;
};

/**
 * An overlay's open state and the operations that drive it.
 */
export type Overlay = {
    /** Whether the overlay is open. */
    isOpen: boolean;
    /**
     * Opens the overlay: runs the placement measurement, captures the focus
     * snapshot the close paths restore from, then flips the state.
     */
    open(): void;
    /**
     * Closes the overlay and applies the focus plan its reason implies.
     *
     * @param reason Why the overlay closed.
     */
    close(reason: OverlayCloseReason): void;
    /** Closes an open overlay with the `toggle` reason, otherwise opens it. */
    toggle(): void;
};

/**
 * Open/close state of a stateful overlay (dropdown list, select, context
 * menu) together with the paths that close it and the focus bookkeeping they
 * share: a press outside, Escape, and — when `closeOnScroll` is set — a
 * scroll of the overlay's scrolling ancestor.
 *
 * Each path closes with a reason, and the reason alone decides where focus
 * goes afterwards; see `resolveOverlayFocusPlan`. The overlay root passed as
 * `overlayRef` is also what those paths treat as "inside".
 *
 * @param overlayRef Ref to the overlay's root element.
 * @param options Placement hook and close-path tuning; see `UseOverlayOptions`.
 * @returns The open state and the open/close/toggle operations.
 */
export function useOverlay(overlayRef: RefObject<HTMLElement>, options: UseOverlayOptions = {}): Overlay {
    const { closeOnScroll = false, onOpen } = options;

    const [isOpen, setIsOpen] = useState(false);
    const { captureOnOpen, applyClosePlan } = useOverlayFocusRestore(overlayRef);

    const open = useCallback(() => {
        onOpen?.();
        // The opener is read in the same task as the activation: the tracker
        // recorded it on the click or keypress that runs this handler.
        captureOnOpen();
        setIsOpen(true);
    }, [captureOnOpen, onOpen]);

    const close = useCallback((reason: OverlayCloseReason) => {
        setIsOpen(false);
        applyClosePlan(resolveOverlayFocusPlan(reason));
    }, [applyClosePlan]);

    const toggle = useCallback(() => {
        if (isOpen) {
            close('toggle');
            return;
        }

        open();
    }, [close, isOpen, open]);

    const handleOutsidePress = useCallback(() => {
        close('outside-pointer');
    }, [close]);

    const handleEscape = useCallback(() => {
        close('escape');
    }, [close]);

    const handleScroll = useCallback(() => {
        if (closeOnScroll) {
            close('scroll');
        }
    }, [close, closeOnScroll]);

    useClickOutside(overlayRef, handleOutsidePress);
    useEscape(handleEscape, [handleEscape]);
    useScrollListener(overlayRef, handleScroll);

    return {
        isOpen,
        open,
        close,
        toggle,
    };
}
