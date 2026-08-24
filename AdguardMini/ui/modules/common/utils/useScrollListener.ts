// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect } from 'preact/hooks';

import type { RefObject } from 'preact';

/**
 * Recursively finds the closest scrollable parent of a given DOM element.
 *
 * @link https://stackoverflow.com/questions/35939886/find-first-scrollable-parent
 *
 * @param node - The DOM element to start searching from.
 * @returns The closest scrollable parent element or null if none is found.
 */
export function getScrollParent(node?: HTMLElement | null): HTMLElement | null {
    if (node == null) {
        return null;
    }
    const { overflowY } = getComputedStyle(node);
    const isScrollable = ['auto', 'scroll'].includes(overflowY);

    if (isScrollable) {
        return node;
    }

    return getScrollParent(node.parentElement);
}

type Handler = (event: Event) => void;

/**
 * Custom hook for adding a scroll event listener to a DOM element.
 */
export function useScrollListener<T extends HTMLElement = HTMLElement>(
    target: RefObject<T>,
    callback: Handler,
) {
    useEffect(() => {
        const { current } = target;
        const scrollParent = getScrollParent(current);

        if (scrollParent) {
            scrollParent.addEventListener('scroll', callback);
        }

        return () => {
            if (scrollParent) {
                scrollParent.removeEventListener('scroll', callback);
            }
        };
    }, [callback]); // eslint-disable-line react-hooks/exhaustive-deps
}
