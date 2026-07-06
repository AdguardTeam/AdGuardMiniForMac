// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useMemo, useState } from 'preact/hooks';

import type { StoryId, StoryInfo } from '../../../modules/stories/model';

/**
 * Hook managing stories navigation state: selection, ordering, adjacent movement.
 *
 * @param stories — array of story entries from useStoriesConfig
 */
export function useStoriesNavigation(stories: StoryInfo[]) {
    const [selectedStoryId, setSelectedStoryId] = useState<StoryId | null>(null);
    const [storiesNavigationOrder, setStoriesNavigationOrder] = useState<StoryId[]>([]);
    const [storyEntryMode, setStoryEntryMode] = useState<'first' | 'last'>('first');

    const storiesById = useMemo(() => {
        return new Map(stories.map(({ storyConfig }) => [storyConfig.id, storyConfig] as const));
    }, [stories]);

    const orderedStoryIds = storiesNavigationOrder.length > 0
        ? storiesNavigationOrder
        : stories.map(({ storyConfig }) => storyConfig.id);

    const currentStoryIndex = selectedStoryId !== null
        ? orderedStoryIds.findIndex((storyId) => storyId === selectedStoryId)
        : -1;

    const getAdjacentStoryId = useCallback((direction: -1 | 1) => {
        if (currentStoryIndex < 0) {
            return null;
        }
        for (
            let nextIndex = currentStoryIndex + direction;
            nextIndex >= 0 && nextIndex < orderedStoryIds.length;
            nextIndex += direction
        ) {
            const candidateStoryId = orderedStoryIds[nextIndex];
            if (storiesById.has(candidateStoryId)) {
                return candidateStoryId;
            }
        }
        return null;
    }, [currentStoryIndex, orderedStoryIds, storiesById]);

    const openStory = useCallback((storyId: StoryId) => {
        setStoriesNavigationOrder(stories.map(({ storyConfig }) => storyConfig.id));
        setStoryEntryMode('first');
        setSelectedStoryId(storyId);
    }, [stories]);

    const moveToNextStory = useCallback(() => {
        const nextStoryId = getAdjacentStoryId(1);
        if (nextStoryId === null) {
            setStoryEntryMode('first');
            setStoriesNavigationOrder([]);
            setSelectedStoryId(null);
            return;
        }
        setStoryEntryMode('first');
        setSelectedStoryId(nextStoryId);
    }, [getAdjacentStoryId]);

    const moveToPreviousStory = useCallback(() => {
        const previousStoryId = getAdjacentStoryId(-1);
        if (previousStoryId === null) {
            return;
        }
        setStoryEntryMode('last');
        setStoryEntryMode('last');
        setSelectedStoryId(previousStoryId);
    }, [getAdjacentStoryId]);

    const closeStories = useCallback(() => {
        setStoryEntryMode('first');
        setStoriesNavigationOrder([]);
        setSelectedStoryId(null);
    }, []);

    return {
        selectedStoryId,
        storyEntryMode,
        storiesById,
        orderedStoryIds,
        currentStoryIndex,
        getAdjacentStoryId,
        openStory,
        moveToNextStory,
        moveToPreviousStory,
        closeStories,
    };
}
