// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { clamp } from '@adg/sciter-utils-kit';
import { useCallback, useRef, useState } from 'preact/hooks';

const STORIES_CONTAINER_WIDTH = 344;
const STORY_SWITCH_INTERACTABLE_AREA_WIDTH = 156;

/**
 * Manages horizontal scroll state for the stories carousel.
 *
 * @param storiesLength Number of stories (determines initial right availability).
 * @returns Scroll state and handlers for the stories carousel.
 */
export function useStoryCarouselScroll(storiesLength: number) {
    const ref = useRef<HTMLDivElement>(null);
    const [scrollIsAvailable, setScrollIsAvailable] = useState({
        left: false,
        right: storiesLength > 2,
    });

    const handleMoveStoriesCards = useCallback((e?: MouseEvent) => {
        const direction = (e?.target as HTMLButtonElement)?.getAttribute('data-switch-direction');
        if (!ref.current || !direction) {
            return;
        }
        const scrollDelta = direction === 'left'
            ? -STORY_SWITCH_INTERACTABLE_AREA_WIDTH
            : STORY_SWITCH_INTERACTABLE_AREA_WIDTH;
        const position = clamp(
            ref.current.scrollLeft + scrollDelta,
            0,
            ref.current.scrollWidth - STORIES_CONTAINER_WIDTH,
        );
        const newLeft = position > 0;
        const newRight = position < ref.current.scrollWidth - STORIES_CONTAINER_WIDTH;
        setScrollIsAvailable({ left: newLeft, right: newRight });
        ref.current.scrollTo({ left: position, behavior: 'smooth' });
    }, []);

    const handleStoriesCardsScroll = useCallback((e: UIEvent) => {
        const target = e.target as HTMLDivElement;
        const maxScroll = target.scrollWidth - STORIES_CONTAINER_WIDTH;
        setScrollIsAvailable({
            left: target.scrollLeft > 0,
            right: target.scrollLeft < maxScroll,
        });
    }, []);

    return { ref, scrollIsAvailable, handleMoveStoriesCards, handleStoriesCardsScroll };
}
