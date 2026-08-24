// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect, useRef, useState } from 'preact/hooks';

import type { UserRulesContainer } from 'Modules/settings/store/modules';

/**
 * Scroll vertical offset to collapse header
 */
const OFFSET_TO_COLLAPSE_HEADER = 124;

/**
 * Use toggle header in user rules page
 *
 * @param rules
 * @param isRuleEditorWindowOpened
 * @param containerRef
 */
export function useToggleHeader(
    rules: UserRulesContainer,
    isRuleEditorWindowOpened: boolean,
    containerRef: React.RefObject<HTMLDivElement>,
): [boolean, (value: boolean) => void] {
    const isScrollingRef = useRef<boolean>(false);
    const [isScrolling, setIsScrolling] = useState(isScrollingRef.current);

    const currentFrameNumberRef = useRef<number>(0);
    const lastScrollReadFrameRef = useRef<number>(-1);
    const rafIdRef = useRef<number | null>(null);
    const trailingTimerRef = useRef<number | null>(null);
    const trailingConfirmTimerRef = useRef<number | null>(null);

    // Store current frame number
    useEffect(() => {
        const tick = () => {
            currentFrameNumberRef.current += 1;
            rafIdRef.current = requestAnimationFrame(tick);
        };
        rafIdRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafIdRef.current != null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const { current: content } = containerRef;

        if (!content) {
            return;
        }

        // "Hot" function
        const readAndUpdate = () => {
            const currentScroll = content.scrollTop;
            const headerCollapsed = currentScroll > OFFSET_TO_COLLAPSE_HEADER;
            if (isScrollingRef.current && !headerCollapsed && currentScroll > 0) {
                return;
            }
            setIsScrolling(!isRuleEditorWindowOpened && headerCollapsed);
            isScrollingRef.current = headerCollapsed;
        };

        // Debouncer
        const maybeRead = (force?: boolean) => {
            const frame = currentFrameNumberRef.current;
            if (!force && frame - lastScrollReadFrameRef.current < 2) {
                return;
            }
            lastScrollReadFrameRef.current = frame;
            readAndUpdate();
        };

        // Clear trailing timers
        const clearTrailingTimers = () => {
            if (trailingTimerRef.current != null) {
                clearTimeout(trailingTimerRef.current);
                trailingTimerRef.current = null;
            }
            if (trailingConfirmTimerRef.current != null) {
                clearTimeout(trailingConfirmTimerRef.current);
                trailingConfirmTimerRef.current = null;
            }
        };

        // Try to smooth out inertia and/or scroll events skipping
        const scheduleTrailing = () => {
            clearTrailingTimers();
            trailingTimerRef.current = window.setTimeout(() => {
                maybeRead(true);
                trailingConfirmTimerRef.current = window.setTimeout(() => {
                    maybeRead(true);
                }, 80);
            }, 120);
        };

        const handleScroll = () => {
            maybeRead(false);
            scheduleTrailing();
        };

        content.addEventListener('scroll', handleScroll);
        content.addEventListener('gesture-pan', handleScroll);
        window.addEventListener('sizechange', handleScroll);

        return () => {
            clearTrailingTimers();
            content.removeEventListener('scroll', handleScroll);
            content.removeEventListener('gesture-pan', handleScroll);
            window.removeEventListener('sizechange', handleScroll);
        };
    }, [rules, isRuleEditorWindowOpened, containerRef]);

    return [isScrolling, setIsScrolling];
}
