// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback, useEffect, useRef } from 'preact/hooks';

import { useTrayStore } from 'Modules/tray/lib/hooks';

import type { StoryNavigation } from '../classes';
import type { StoryId } from 'Modules/tray/modules/stories/model';
import type { VNode } from 'preact';

type FlushCompletedStoriesProps = {
    currentStory: StoryNavigation;
    children(props: { addCompletedStory(storyId: StoryId): void }): VNode;
};

/**
 * Component that flushes completed stories on unmount
 */
export function FlushCompletedStories({ children, currentStory }: FlushCompletedStoriesProps) {
    const { settings } = useTrayStore();

    const completedStoriesRef = useRef<StoryId[]>([]);

    const onStoryCompleted = useCallback((storyId: StoryId) => {
        if (currentStory.onBeforeClose) {
            currentStory.onBeforeClose();
        }
        completedStoriesRef.current.push(storyId);
    }, [currentStory]);

    useEffect(() => {
        // Save new order only on unmount
        return () => {
            // Avoid duplicate writes when the same story is completed more than once.
            const completedStories = [...new Set(completedStoriesRef.current)];

            completedStories.forEach((storyId) => {
                settings.setCompletedStory(storyId);
            });
        };
    }, [settings]);

    return children({ addCompletedStory: onStoryCompleted });
}
